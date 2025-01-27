const User = require('@models/User');
const generateJWT  = require('@utils/generateJWT');
const { generateRefreshToken, validateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');

/**
 * Registro de nuevos usuarios.
 */
const register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Verificar si el usuario o correo ya existe
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            return res.status(400).json({ error: 'El usuario o correo ya está registrado.' });
        }

        // Crear nuevo usuario
        const user = await User.create({
            username,
            email,
            password, // Se encripta automáticamente por el middleware
            provider: 'local',
        });

        // Generar token JWT
        const token = generateJWT({ id: user._id, username: user.username, role: user.role });

        res.status(201).json({ token });
    } catch (error) {
        // Registrar el error en los logs
        apiLogger.error(`Error al registrar el usuario: ${error.message}`, {
            stack: error.stack,
        });

        res.status(500).json({ error: 'Error al registrar el usuario. Por favor, intente nuevamente.' });
    }
};

/**
 * Inicio de sesión de usuarios existentes.
 */
const login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

        // Buscar usuario por correo
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error('El email es inválido.');
            error.status = 401;
            throw error;
        }

        // Verificar contraseña
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            const error = new Error('El password es inválido.');
            error.status = 401;
            throw error;
        }
    
        // Generar tokens
        const accessToken = generateJWT(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
    
        // Guardar Refresh Token en la base de datos
        user.refreshToken = refreshToken;
        await user.save();
    
        // Responder con los tokens
        res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
        next(error);
    }
};

const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            const error = new Error('Refresh Token es requerido.');
            error.status = 400;
            throw error;
        }

        // Validar Refresh Token
        const payload = validateRefreshToken(refreshToken);
        if (!payload) {
            const error = new Error('Refresh Token inválido.');
            error.status = 403;
            throw error;
        }

        // Verificar si el Refresh Token está en la base de datos
        const user = await User.findOne({ refreshToken });
        if (!user) {
            const error = new Error('Token no asociado a ningún usuario.');
            error.status = 403;
            throw error;
        }

        // Generar un nuevo Access Token
        const newAccessToken = generateJWT(user.id, user.role);

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, refreshAccessToken };
