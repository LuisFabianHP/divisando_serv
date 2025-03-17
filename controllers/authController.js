const User = require('@models/User');
const { generateRefreshToken, validateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');

/**
 * Registro de nuevos usuarios.
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Verificar si el usuario o correo ya existe
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            return res.status(400).json({ error: 'El usuario o correo ya está registrado.' });
        }

        // Crear nuevo usuario
        const user = await User.create({
            username,
            email,
            password,
            provider: 'local',
            refreshToken: '' // Inicialmente vacío
        });

        // Generar Refresh Token y calcular fecha de expiración
        const refreshToken = generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_EXPIRES_IN || 7)); // 7 días por defecto

        user.refreshToken = refreshToken;
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

module.exports = { 
    register, 
    login, 
    refreshAccessToken, 
    logout 
};
