const User = require('@models/User');
const VerificationCode = require('@models/VerificationCode');
const { generateRefreshToken, validateRefreshToken } = require('@utils/refreshToken');
const { sendVerificationEmail, sendPasswordChangedEmail } = require('@services/emailService.js');
const { apiLogger } = require('@utils/logger');
const { normalizeEnvValue } = require('@utils/envNormalizer');
const { OAuth2Client } = require('google-auth-library');

const getGoogleAudiences = () => {
    const direct = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
    ]
        .filter(Boolean)
        .map((value) => normalizeEnvValue(value))
        .filter(Boolean);

    const fromList = (process.env.GOOGLE_CLIENT_IDS || '')
        .split(',')
        .map((value) => normalizeEnvValue(value))
        .filter(Boolean);

    return [...new Set([...direct, ...fromList])];
};

/**
 * Registro de nuevos usuarios.
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Verificar si el usuario o correo ya existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'El usuario o correo ya está registrado.' });
        }

        // Crear nuevo usuario
        const user = await User.create({
            username,
            email,
            password,
            provider: 'local',
            refreshToken: ''
        });

        // Generar código de verificación
        await generateVerificationCode(user._id, email);

        res.status(200).json({ userId: user.id });
    } catch (error) {
        apiLogger.error(`Error al registrar el usuario: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: 'Error al registrar la cuenta de usuario.' });
    }
};

/**
 * Verificar código de nuevos usuarios.
 */
const verificationCode  = async (req, res, next) => {
    try {
        const { code, userId, email } = req.body;

        // Buscar usuario por userId o por email
        const user = userId ? await User.findById(userId) : await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
        }

        // Buscar el código sin filtrar por tipo para soportar account_verification y password_reset
        const verificationCode = await VerificationCode.findOne({ userId: user._id, code });
        
        // Validar si el código existe
        if (!verificationCode) {
            // Incrementar intentos fallidos en todos los códigos activos del usuario
            const now = new Date();
            const latestCode = await VerificationCode.findOne({
                userId: user._id,
                expiresAt: { $gt: now }
            }).sort({ expiresAt: -1 });

            if (latestCode) {
                const updatedCode = await VerificationCode.findOneAndUpdate(
                    { _id: latestCode._id },
                    { $inc: { attempts: 1 } },
                    { new: true }
                );

                if (updatedCode && updatedCode.attempts >= updatedCode.maxAttempts) {
                    updatedCode.isBlocked = true;
                    await updatedCode.save();

                    return res.status(403).json({
                        success: false,
                        error: 'Código bloqueado por exceso de intentos. Solicita un nuevo código.'
                    });
                }
            }
            
            return res.status(400).json({ success: false, error: 'Código inválido.' });
        }

        // Validar si el código está bloqueado por exceso de intentos
        if (verificationCode.isBlocked) {
            return res.status(403).json({ 
                success: false, 
                error: 'Código bloqueado por exceso de intentos. Solicita un nuevo código.' 
            });
        }

        // Validar si el código expiró
        if (verificationCode.expiresAt < new Date()) {
            return res.status(400).json({ success: false, error: 'Código expirado.' });
        }

        // Validar si se excedieron los intentos permitidos
        if (verificationCode.attempts >= verificationCode.maxAttempts) {
            verificationCode.isBlocked = true;
            await verificationCode.save();
            
            apiLogger.warn('Código bloqueado por exceso de intentos', {
                userId: user._id,
                email: user.email,
                attempts: verificationCode.attempts
            });
            
            return res.status(403).json({ 
                success: false, 
                error: 'Has excedido el número máximo de intentos. Solicita un nuevo código.' 
            });
        }

        // Comportamientos distintos según el tipo de código
        if (verificationCode.type === 'account_verification') {
            // Eliminar código y generar Refresh Token y calcular fecha de expiración
            await VerificationCode.deleteOne({ _id: verificationCode._id });
            // Generar Refresh Token y calcular fecha de expiración
            const refreshToken = generateRefreshToken(user.id);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto

            user.refreshToken = refreshToken;
            user.isVerified = true;
            await user.save();

            apiLogger.info('Cuenta verificada exitosamente', {
                userId: user._id,
                email: user.email
            });

            return res.status(200).json({ success: true, refreshToken, expiresAt });
        }

        if (verificationCode.type === 'password_reset') {
            // Para reset de contraseña devolvemos éxito y datos mínimos para continuar en cliente
            apiLogger.info('Código de reset de contraseña verificado', {
                userId: user._id,
                email: user.email
            });
            
            return res.status(200).json({ success: true, userId: user.id, email: user.email });
        }

        // Si por alguna razón el tipo no está reconocido
        res.status(400).json({ success: false, error: 'Tipo de código no reconocido.' });
    } catch (error) {
        apiLogger.error(`Error en verificación de código: ${error.message}`, { stack: error.stack });
        next(error);
    }
};


/**
 * Inicio de sesión de usuarios existentes.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto
    
        // Regenerar y asignar Refresh Token
        user.refreshToken = refreshToken;
        await user.save();
    
        res.status(200).json({ refreshToken, expiresAt });
    } catch (error) {
        apiLogger.error(`Error en login: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * Inicio de sesión con Google usando idToken (para mobile/Flutter)
 */
const loginWithGoogle = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        
        if (!idToken) {
            return res.status(400).json({ error: 'idToken es requerido.' });
        }

        const googleAudiences = getGoogleAudiences();
        if (googleAudiences.length === 0) {
            apiLogger.error('Configuración Google incompleta: falta GOOGLE_CLIENT_ID o audiencias equivalentes.');
            return res.status(500).json({ error: 'Configuración Google incompleta en servidor.' });
        }

        // Verificar firma/issuer/expiración del idToken con Google
        const client = new OAuth2Client(googleAudiences[0]);
        const ticket = await client.verifyIdToken({
            idToken,
        });
        
        const payload = ticket.getPayload();
        const tokenAudience = (payload?.aud || '').trim();
        const tokenAuthorizedParty = (payload?.azp || '').trim();

        const audienceMatches = googleAudiences.includes(tokenAudience);
        const azpMatches = tokenAuthorizedParty ? googleAudiences.includes(tokenAuthorizedParty) : false;

        if (!audienceMatches && !azpMatches) {
            apiLogger.error('Error en loginWithGoogle: Wrong recipient, payload audience != requiredAudience', {
                tokenAudience,
                tokenAuthorizedParty,
                configuredAudiences: googleAudiences,
            });
            return res.status(401).json({ error: 'Token de Google inválido.' });
        }

        const { sub: googleId, email, name } = payload;

        // Buscar o crear usuario
        let user = await User.findOne({ providerId: googleId, provider: 'google' });

        if (!user) {
            // Crear nuevo usuario
            user = await User.create({
                username: name,
                email: email,
                provider: 'google',
                providerId: googleId,
                isVerified: true, // Los usuarios de Google ya están verificados
                refreshToken: '',
            });
        }

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7));

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({ refreshToken, expiresAt });
    } catch (error) {
        apiLogger.error(`Error en loginWithGoogle: ${error.message}`, { stack: error.stack });
        res.status(401).json({ error: 'Token de Google inválido.' });
    }
};

/**
 * Inicio de sesión con Apple usando identityToken (para mobile/Flutter)
 */
const loginWithApple = async (req, res, next) => {
    try {
        const { identityToken } = req.body;
        
        if (!identityToken) {
            return res.status(400).json({ error: 'identityToken es requerido.' });
        }

        // TODO: Verificar el identityToken con Apple
        // Por ahora usamos una validación básica
        // En producción, deberías usar la librería apple-signin-auth o similar
        
        // Decodificar el JWT sin verificar (solo para desarrollo)
        const parts = identityToken.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({ error: 'Token de Apple inválido.' });
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const { sub: appleId, email } = payload;

        // Buscar o crear usuario
        let user = await User.findOne({ providerId: appleId, provider: 'apple' });

        if (!user) {
            // Crear nuevo usuario
            user = await User.create({
                username: email ? email.split('@')[0] : `apple_user_${appleId.substring(0, 8)}`,
                email: email || `${appleId}@privaterelay.appleid.com`,
                provider: 'apple',
                providerId: appleId,
                isVerified: true, // Los usuarios de Apple ya están verificados
                refreshToken: '',
            });
        }

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7));

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({ refreshToken, expiresAt });
    } catch (error) {
        apiLogger.error(`Error en loginWithApple: ${error.message}`, { stack: error.stack });
        res.status(401).json({ error: 'Token de Apple inválido.' });
    }
};

/**
 * Endpoint para renovar Access Token
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'El Refresh Token es requerido.' });
        }
    
        const payload = validateRefreshToken(refreshToken);
        if (!payload) {
            return res.status(403).json({ error: 'Refresh Token inválido.' });
        }
    
        const user = await User.findById(payload.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ error: 'Refresh Token no válido.' });
        }
    
        // Regenerar Refresh Token y devolverlo
        user.refreshToken = generateRefreshToken(user.id);
        await user.save();
        
        // Calcular fecha de expiración (misma lógica que en login)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7));
    
        res.status(200).json({ refreshToken: user.refreshToken, expiresAt });
    } catch (error) {
        apiLogger.error(`Error en refresh token: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * Endpoint para cerrar la sesión
 */
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'El Refresh Token es requerido para cerrar sesión.' });
        }
    
        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res.status(403).json({ error: 'El Refresh Token no está asociado a ningún usuario.' });
        }
    
        // Eliminar Refresh Token
        user.refreshToken = '';
        await user.save();
    
        res.status(200).json({ message: 'Sesión cerrada correctamente.' });
    } catch (error) {
        apiLogger.error('Error en logout', { message: error.message, stack: error.stack });
        next(error);
    }
};

/**
 * Generar y guardar código de verificación.
 */
const generateVerificationCode = async (userId, email) => {
    try {
        // Revisar si ya existe un código activo
        const code = await generateAndStoreVerificationCode(userId, 'account_verification');
        
        // Enviar el código por correo
        await sendVerificationEmail(email, code);
        return;
    } catch(error){
        apiLogger.error(`Error al generar el código de verificación: ${error.message}`, { stack: error.stack });
        throw new Error('Error al intentar generar el código de verificación.');     
    }

};

/**
 * Reenviar código de verificación.
 */
const resendVerificationCode = async (req, res, next) => {
    try {
        const { userId, email } = req.body;
        const user = await User.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
        }

        // Solo permitir reenvío si no hay un código activo
        const existingCode = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
        if (existingCode && existingCode.expiresAt > new Date()) {
            return res.status(400).json({ success: false, error: 'Ya existe un código válido, revisa tu correo o intenta en 5 min.' });
        }

        await generateVerificationCode(user._id, email);

        res.status(200).json({ success: true, message: 'Nuevo código de verificación enviado.' });
    } catch (error) {
        apiLogger.error(`Error en reenvío de código: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.ip;
        const userAgent = req.headers['user-agent'];
        
        console.log(`🔍 Solicitud de recuperación para: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Log de auditoría para solicitud de código de recuperación
        apiLogger.info('Solicitud de código de recuperación', {
            userId: user._id,
            email: user.email,
            ip: ip,
            userAgent: userAgent,
            timestamp: new Date().toISOString()
        });

        // Revisar si ya existe un código activo
        const code = await generateAndStoreVerificationCode(user._id, 'password_reset');

        await sendVerificationEmail(user.email, code);

        // Devolver userId opcional para que la UI pueda reutilizarlo si es necesario
        res.status(200).json({ success: true, message: 'Código de recuperación enviado.', userId: user.id });
    } catch (error) {
        apiLogger.error(`Error en recuperación de contraseña: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.ip;
        const userAgent = req.headers['user-agent'];
        
        console.log(`🔑 Intento de recuperación para: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const verificationCode = await VerificationCode.findOne({ userId: user._id, code, type: 'password_reset' });
        if (!verificationCode || verificationCode.expiresAt < new Date()) {
            // Log de intento fallido
            apiLogger.warn('Intento de reset de contraseña fallido - código inválido o expirado', {
                userId: user._id,
                email: user.email,
                ip: ip,
                userAgent: userAgent,
                timestamp: new Date().toISOString()
            });
            
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        // Eliminar código después de usarlo
        await VerificationCode.deleteOne({ _id: verificationCode._id });

        // Cifrar la nueva contraseña
        user.password = newPassword;
        await user.save();

        // Log de auditoría para cambio exitoso de contraseña
        apiLogger.info('Reset de contraseña exitoso', {
            userId: user._id,
            email: user.email,
            ip: ip,
            userAgent: userAgent,
            timestamp: new Date().toISOString()
        });

        // Enviar email de confirmación al usuario
        await sendPasswordChangedEmail(user.email, user.username);

        console.log(`✅ Contraseña restablecida correctamente.`);
        res.status(200).json({ success: true, message: 'Contraseña restablecida correctamente.' });
    } catch (error) {
        apiLogger.error(`Error al restablecer contraseña: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const generateAndStoreVerificationCode = async (userId, type) => {
    try {
        // Revisar si ya existe un código activo
        const existingCode = await VerificationCode.findOne({ userId, type });
        if (existingCode && existingCode.expiresAt > new Date()) {
            throw new Error('Ya existe un código válido. Intenta más tarde.');
        }

        // Generar nuevo código de 6 dígitos
        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expira en 5 min

        await VerificationCode.create({ userId, code, expiresAt, type });

        return code;
    } catch (error) {
        apiLogger.error(`Error al generar código de verificación (${type}): ${error.message}`, { stack: error.stack });
        throw new Error('Error al generar el código de verificación.');
    }
};

module.exports = { 
    register, 
    login,
    loginWithGoogle,
    loginWithApple,
    refreshAccessToken, 
    logout,
    verificationCode,
    resendVerificationCode,
    forgotPassword,
    resetPassword
};
