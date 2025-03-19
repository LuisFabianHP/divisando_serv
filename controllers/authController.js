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
        const { code, userId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const verificationCode = await VerificationCode.findOne({ userId, code, type: 'account_verification' });
        if (!verificationCode || verificationCode.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        // Eliminar código y actualizar usuario
        await VerificationCode.deleteOne({ _id: verificationCode._id });

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(userId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto

        user.refreshToken = refreshToken;
        user.isVerified = true;
        await user.save();
    
        res.status(200).json({ refreshToken, expiresAt });
    } catch (error) {
        apiLogger.error(`Error al registrar el usuario: ${error.message}`, { stack: error.stack });
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
        // Revisar si ya existe un código válido
        const existingCode = await VerificationCode.findOne({ userId, type: 'account_verification' });
        if (existingCode) {
            return;
        }

        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expira en 5 min

        await VerificationCode.create({ 
            userId, 
            code, 
            expiresAt,
            type: 'account_verification' 
        });
        
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
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Solo permitir reenvío si no hay un código activo
        const existingCode = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
        if (existingCode && existingCode.expiresAt > new Date()) {
            return res.status(400).json({ error: 'Ya existe un código válido. Intenta más tarde.' });
        }

        await generateVerificationCode(user._id);

        res.status(200).json({ message: 'Nuevo código de verificación enviado.' });
    } catch (error) {
        apiLogger.error(`Error en reenvío de código: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = { 
    register, 
    login, 
    refreshAccessToken, 
    logout,
    verificationCode,
    resendVerificationCode
};
