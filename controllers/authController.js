const User = require('@models/User');
const VerificationCode = require('@models/VerificationCode');
const { generateRefreshToken, validateRefreshToken } = require('@utils/refreshToken');
const { sendVerificationEmail } = require('@services/emailService.js');
const { apiLogger } = require('@utils/logger');

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
        if (!verificationCode || verificationCode.expiresAt < new Date()) {
            return res.status(400).json({ success: false, error: 'Código inválido o expirado.' });
        }

        // Eliminar código después de usarlo
        await VerificationCode.deleteOne({ _id: verificationCode._id });

        // Comportamientos distintos según el tipo de código
        if (verificationCode.type === 'account_verification') {
            // Generar Refresh Token y calcular fecha de expiración
            const refreshToken = generateRefreshToken(user.id);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto

            user.refreshToken = refreshToken;
            user.isVerified = true;
            await user.save();

            return res.status(200).json({ success: true, refreshToken, expiresAt });
        }

        if (verificationCode.type === 'password_reset') {
            // Para reset de contraseña devolvemos éxito y datos mínimos para continuar en cliente
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
    
        res.status(200).json({ refreshToken: user.refreshToken });
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
        console.log(`🔍 Solicitud de recuperación para: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

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
        console.log(`🔑 Intento de recuperación para: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const verificationCode = await VerificationCode.findOne({ userId: user._id, code, type: 'password_reset' });
        if (!verificationCode || verificationCode.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        // Eliminar código después de usarlo
        await VerificationCode.deleteOne({ _id: verificationCode._id });

        // Cifrar la nueva contraseña
        user.password = newPassword;
        await user.save();

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
    refreshAccessToken, 
    logout,
    verificationCode,
    resendVerificationCode,
    forgotPassword,
    resetPassword
};
