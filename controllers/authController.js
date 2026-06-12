const User = require('@models/User');
const VerificationCode = require('@models/VerificationCode');
const mongoose = require('mongoose');
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

const buildUserPayload = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
});

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const getUserIdFromTokenPayload = (payload = {}) => payload.id || payload.userId || payload._id || null;
const isValidObjectId = (value) => Boolean(value) && mongoose.Types.ObjectId.isValid(String(value));
const activeOrLegacyStatusFilter = {
    $or: [{ status: 'active' }, { status: { $exists: false } }],
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
            return res.status(400).json({ success: false, error: 'usuario_ya_registrado' });
        }

        // Crear nuevo usuario
        const user = await User.create({
            username,
            email,
            password,
            provider: 'local',
            refreshToken: ''
        });

        try {
            // Generar código de verificación
            await generateVerificationCode(user._id, email);
        } catch (mailError) {
            // Si falla el envío de correo, revertir creación para permitir reintento limpio.
            await VerificationCode.deleteMany({ userId: user._id });
            await User.deleteOne({ _id: user._id });

            apiLogger.error('Registro revertido por fallo de correo de verificación', {
                email,
                providerStatus: mailError.providerStatus || 'N/A',
                providerMessage: mailError.providerMessage || mailError.message,
            });

            return res.status(503).json({ success: false, error: 'error_envio_correo' });
        }

        res.status(200).json({ success: true, userId: user.id });
    } catch (error) {
        apiLogger.error(`Error al registrar el usuario: ${error.message}`, { stack: error.stack });
        // Solo mostrar mensaje descriptivo en consola
        console.error('Error al registrar el usuario. Consulta los logs para más detalles.');
        res.status(500).json({ success: false, error: 'error_interno' });
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
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
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

                    return res.status(403).json({ success: false, error: 'codigo_bloqueado' });
                }
            }
            
            return res.status(400).json({ success: false, error: 'codigo_invalido' });
        }

        // Validar si el código está bloqueado por exceso de intentos
        if (verificationCode.isBlocked) {
            return res.status(403).json({ success: false, error: 'codigo_bloqueado' });
        }

        // Validar si el código expiró
        if (verificationCode.expiresAt < new Date()) {
            return res.status(400).json({ success: false, error: 'codigo_expirado' });
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
            
            return res.status(403).json({ success: false, error: 'codigo_bloqueado' });
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

            return res.status(200).json({ success: true, refreshToken, expiresAt, user: buildUserPayload(user) });
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
        res.status(400).json({ success: false, error: 'tipo_codigo_invalido' });
    } catch (error) {
        apiLogger.error(`Error en verificación de código: ${error.message}`, { stack: error.stack });
        console.error('Error en verificación de código. Consulta los logs para más detalles.');
        next(error);
    }
};


/**
 * Inicio de sesión de usuarios existentes.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email, ...activeOrLegacyStatusFilter });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, error: 'credenciales_invalidas' });
        }

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto
    
        // Regenerar y asignar Refresh Token
        user.refreshToken = refreshToken;
        await user.save();
    
        res.status(200).json({ success: true, refreshToken, expiresAt, user: buildUserPayload(user) });
    } catch (error) {
        apiLogger.error(`Error en login: ${error.message}`, { stack: error.stack });
        console.error('Error en login. Consulta los logs para más detalles.');
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
            return res.status(400).json({ success: false, error: 'idtoken_requerido' });
        }

        const googleAudiences = getGoogleAudiences();
        if (googleAudiences.length === 0) {
            apiLogger.error('Configuración Google incompleta: falta GOOGLE_CLIENT_ID o audiencias equivalentes.');
            return res.status(500).json({ success: false, error: 'configuracion_google_incompleta' });
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
            return res.status(401).json({ success: false, error: 'token_google_invalido' });
        }

        const { sub: googleId, email, name } = payload;

        // Buscar o crear usuario
        let user = await User.findOne({ providerId: googleId, provider: 'google', ...activeOrLegacyStatusFilter });

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

        res.status(200).json({ success: true, refreshToken, expiresAt, user: buildUserPayload(user) });
    } catch (error) {
        apiLogger.error(`Error en loginWithGoogle: ${error.message}`, { stack: error.stack });
        console.error('Error en login con Google. Consulta los logs para más detalles.');
        res.status(401).json({ success: false, error: 'token_google_invalido' });
    }
};

/**
 * Inicio de sesión con Apple usando identityToken (para mobile/Flutter)
 */
const loginWithApple = async (req, res, next) => {
    try {
        const { identityToken } = req.body;
        
        if (!identityToken) {
            return res.status(400).json({ success: false, error: 'identity_token_requerido' });
        }

        // TODO: Verificar el identityToken con Apple
        // Por ahora usamos una validación básica
        // En producción, deberías usar la librería apple-signin-auth o similar
        
        // Decodificar el JWT sin verificar (solo para desarrollo)
        const parts = identityToken.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({ success: false, error: 'token_apple_invalido' });
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const { sub: appleId, email } = payload;

        // Buscar o crear usuario
        let user = await User.findOne({ providerId: appleId, provider: 'apple', ...activeOrLegacyStatusFilter });

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

        res.status(200).json({ success: true, refreshToken, expiresAt, user: buildUserPayload(user) });
    } catch (error) {
        apiLogger.error(`Error en loginWithApple: ${error.message}`, { stack: error.stack });
        console.error('Error en login con Apple. Consulta los logs para más detalles.');
        res.status(401).json({ success: false, error: 'token_apple_invalido' });
    }
};

/**
 * Endpoint para renovar Access Token
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'refresh_token_requerido' });
        }
    
        const payload = validateRefreshToken(refreshToken);
        if (!payload) {
            return res.status(403).json({ success: false, error: 'refresh_token_invalido' });
        }
    
        const user = await User.findOne({ _id: payload.id, ...activeOrLegacyStatusFilter });
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ success: false, error: 'refresh_token_invalido' });
        }
    
        // Regenerar Refresh Token y devolverlo
        user.refreshToken = generateRefreshToken(user.id);
        await user.save();
        
        // Calcular fecha de expiración (misma lógica que en login)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7));
    
        res.status(200).json({ success: true, refreshToken: user.refreshToken, expiresAt, user: buildUserPayload(user) });
    } catch (error) {
        apiLogger.error(`Error en refresh token: ${error.message}`, { stack: error.stack });
        console.error('Error en refresh token. Consulta los logs para más detalles.');
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
            return res.status(400).json({ success: false, error: 'refresh_token_requerido' });
        }
    
        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res.status(403).json({ success: false, error: 'refresh_token_no_encontrado' });
        }
    
        // Eliminar Refresh Token
        user.refreshToken = '';
        await user.save();
    
        res.status(200).json({ success: true });
    } catch (error) {
        apiLogger.error('Error en logout', { message: error.message, stack: error.stack });
        console.error('Error en logout. Consulta los logs para más detalles.');
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
        console.error('Error al generar el código de verificación. Consulta los logs para más detalles.');
        if (!error.status && !error.statusCode) {
            error.status = 503;
            error.statusCode = 503;
        }
        if (!error.userMessage) {
            error.userMessage = 'No se pudo generar el código de verificación. Intenta nuevamente más tarde.';
        }
        throw error;
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
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
        }

        // Solo permitir reenvío si no hay un código activo
        const existingCode = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
        if (existingCode && existingCode.expiresAt > new Date()) {
            return res.status(400).json({ success: false, error: 'codigo_activo_existente' });
        }

        await generateVerificationCode(user._id, email);

        res.status(200).json({ success: true });
    } catch (error) {
        apiLogger.error(`Error en reenvío de código: ${error.message}`, { stack: error.stack });
        console.error('Error en reenvío de código. Consulta los logs para más detalles.');
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
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
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
        res.status(200).json({ success: true, userId: user.id });
    } catch (error) {
        apiLogger.error(`Error en recuperación de contraseña: ${error.message}`, { stack: error.stack });
        console.error('Error en recuperación de contraseña. Consulta los logs para más detalles.');
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
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
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
            
            return res.status(400).json({ success: false, error: 'codigo_invalido_o_expirado' });
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
        res.status(200).json({ success: true });
    } catch (error) {
        apiLogger.error(`Error al restablecer contraseña: ${error.message}`, { stack: error.stack });
        console.error('Error al restablecer contraseña. Consulta los logs para más detalles.');
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
        console.error('Error al generar código de verificación. Consulta los logs para más detalles.');
        throw new Error('Error al generar el código de verificación.');
    }
};

/**
 * Cancelación de cuenta (soft delete)
 * DELETE /auth/account
 * Requiere JWT. Opcional: password en body para reconfirmar.
 */
const cancelAccount = async (req, res, next) => {
    try {
        const userId = getUserIdFromTokenPayload(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }
        if (!isValidObjectId(userId)) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }

        const { password } = req.body || {};
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
        }
        if (user.status === 'deleted') {
            return res.status(400).json({ success: false, error: 'cuenta_ya_cancelada' });
        }
        // Si el usuario tiene password (no social), pedir confirmación
        if (user.provider === 'local') {
            if (!password || !(await user.matchPassword(password))) {
                return res.status(401).json({ success: false, error: 'contrasena_incorrecta' });
            }
        }
        user.status = 'deleted';
        user.deletedAt = new Date();
        user.refreshToken = '';
        await user.save();
        // Opcional: invalidar otros tokens activos (según implementación)
        res.status(200).json({ success: true });
    } catch (error) {
        apiLogger.error(`Error en cancelAccount: ${error.message}`, { stack: error.stack });
        res.status(500).json({ success: false, error: 'error_interno' });
    }
};

/**
 * Obtener perfil del usuario autenticado.
 * GET /auth/profile
 */
const getProfile = async (req, res) => {
    try {
        const userId = getUserIdFromTokenPayload(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }
        if (!isValidObjectId(userId)) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }

        const user = await User.findById(userId);
        if (!user || user.status !== 'active') {
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
        }

        return res.status(200).json({
            success: true,
            user: {
                ...buildUserPayload(user),
                isVerified: user.isVerified,
                status: user.status,
            }
        });
    } catch (error) {
        apiLogger.error(`Error en getProfile: ${error.message}`, { stack: error.stack });
        return res.status(500).json({ success: false, error: 'error_interno' });
    }
};

/**
 * Actualizar perfil del usuario autenticado.
 * PUT /auth/profile
 * Campos permitidos: username, email
 */
const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body || {};

        if (typeof username === 'undefined' && typeof email === 'undefined') {
            return res.status(400).json({ success: false, error: 'campos_requeridos' });
        }

        const userId = getUserIdFromTokenPayload(req.user);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }
        if (!isValidObjectId(userId)) {
            return res.status(401).json({ success: false, error: 'token_invalido' });
        }

        const user = await User.findById(userId);
        if (!user || user.status !== 'active') {
            return res.status(404).json({ success: false, error: 'usuario_no_encontrado' });
        }

        if (typeof username !== 'undefined') {
            const sanitizedUsername = String(username).trim();
            if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
                return res.status(400).json({ success: false, error: 'username_invalido' });
            }

            if (sanitizedUsername !== user.username) {
                const usernameExists = await User.findOne({ username: sanitizedUsername, _id: { $ne: user._id } });
                if (usernameExists) {
                    return res.status(409).json({ success: false, error: 'username_en_uso' });
                }
            }

            user.username = sanitizedUsername;
        }

        if (typeof email !== 'undefined') {
            const sanitizedEmail = String(email).trim().toLowerCase();
            if (!isValidEmail(sanitizedEmail)) {
                return res.status(400).json({ success: false, error: 'email_invalido' });
            }

            if (sanitizedEmail !== user.email) {
                const emailExists = await User.findOne({ email: sanitizedEmail, _id: { $ne: user._id } });
                if (emailExists) {
                    return res.status(409).json({ success: false, error: 'email_en_uso' });
                }
            }

            user.email = sanitizedEmail;
        }

        await user.save();

        apiLogger.info('Perfil actualizado', {
            userId: user._id,
            email: user.email,
            updatedFields: Object.keys(req.body || {}),
            timestamp: new Date().toISOString()
        });

        return res.status(200).json({ success: true, user: buildUserPayload(user) });
    } catch (error) {
        apiLogger.error(`Error en updateProfile: ${error.message}`, { stack: error.stack });
        return res.status(500).json({ success: false, error: 'error_interno' });
    }
};

module.exports = { 
    register, 
    login,
    loginWithGoogle,
    loginWithApple,
    cancelAccount,
    getProfile,
    updateProfile,
    refreshAccessToken, 
    logout,
    verificationCode,
    resendVerificationCode,
    forgotPassword,
    resetPassword
};
