const User = require('@models/User');
const generateJWT  = require('@utils/generateJWT');
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
            refreshTokens: ''
        });

        // Generar tokens
        const token = generateJWT(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        
        // Guardar el Refresh Token
        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({ token, refreshToken });
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
    
        const accessToken = generateJWT(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
    
        // Almacenar el Refresh Token
        user.refreshToken = refreshToken;
        await user.save();
    
        res.status(200).json({ accessToken, refreshToken });
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
            return res.status(403).json({ error: 'Refresh Token inválido o expirado.' });
        }

        const user = await User.findById(payload.id);
        if (!user) {
            return res.status(403).json({ error: 'Usuario no encontrado.' });
        }

        // Filtrar tokens expirados
        user.refreshTokens = user.refreshTokens.filter(t => new Date(t.expiresAt) > new Date());

        // Verificar si el refreshToken sigue siendo válido
        const validToken = user.refreshTokens.find(t => t.token === refreshToken);
        if (!validToken) {
            return res.status(403).json({ error: 'Refresh Token no válido.' });
        }

        // Generar nuevos tokens
        const newAccessToken = generateJWT(user.id, user.role);
        const { token: newRefreshToken, expiresAt } = generateRefreshToken(user.id);

        // Reemplazar el token viejo por el nuevo
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        user.refreshTokens.push({ token: newRefreshToken, expiresAt });

        // Mantener máximo 5 tokens por usuario
        if (user.refreshTokens.length > 5) {
            user.refreshTokens.shift();
        }

        await user.save();

        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
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
    
        const user = await User.findOne({ 'refreshTokens.token': refreshToken });
        if (!user) {
            return res.status(403).json({ error: 'El Refresh Token no está asociado a ningún usuario.' });
        }
    
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        await user.save();
    
        res.status(200).json({ message: 'Sesión cerrada correctamente.' });
    } catch (error) {

        next(error);
    }
};

module.exports = { 
    register, 
    login, 
    refreshAccessToken, 
    logout 
};
