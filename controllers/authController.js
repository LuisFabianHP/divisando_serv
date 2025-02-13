const User = require('@models/User');
const generateJWT = require('@utils/generateJWT');
const { generateRefreshToken, validateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');

/**
 * Registro de nuevos usuarios.
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Verificar si el usuario o correo ya existe
        if (await User.exists({ $or: [{ username }, { email }] })) {
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

        // Generar tokens
        const accessToken = generateJWT(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        
        // Guardar el Refresh Token
        await User.findByIdAndUpdate(user.id, { refreshToken });

        res.status(201).json({ accessToken, refreshToken });
    } catch (error) {
        apiLogger.error('Error al registrar usuario', { message: error.message, stack: error.stack });
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
    
        // Guardar el Refresh Token
        await User.findByIdAndUpdate(user.id, { refreshToken });

        res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
        apiLogger.error('Error en login', { message: error.message, stack: error.stack });
        next(error);
    }
};

/**
 * Endpoint para renovar Access Token.
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

        const newAccessToken = generateJWT(user.id, user.role);
        const newRefreshToken = generateRefreshToken(user.id);

        // Reemplazar el Refresh Token
        await User.findByIdAndUpdate(user.id, { refreshToken: newRefreshToken });

        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        apiLogger.error('Error en refresh token', { message: error.message, stack: error.stack });
        next(error);
    }
};

/**
 * Endpoint para cerrar la sesión.
 */
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'El Refresh Token es requerido para cerrar sesión.' });
        }

        // Eliminar solo si coincide
        const result = await User.findOneAndUpdate(
            { refreshToken },
            { refreshToken: '' },
            { new: true }
        );

        if (!result) {
            return res.status(403).json({ error: 'El Refresh Token no está asociado a ningún usuario.' });
        }

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