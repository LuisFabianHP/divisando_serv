const User = require('../models/User');
const generateJWT  = require('../utils/generateJWT');
const { apiLogger } = require('../utils/logger');

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
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuario por correo
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        // Verificar contraseña
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        // Generar token JWT
        const token = generateJWT({ id: user._id, username: user.username, role: user.role });

        res.json({ token });
    } catch (error) {
        // Registrar el error en los logs
        apiLogger.error(`Error al iniciar sesión: ${error.message}`, {
            stack: error.stack,
        });

        res.status(500).json({ error: 'Error al iniciar sesión. Por favor, intente nuevamente.' });
    }
};

module.exports = { register, login };
