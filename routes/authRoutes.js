const express = require('express');
const passport = require('passport');
const { login, register, refreshAccessToken, logout } = require('@controllers/authController');
const { generateRefreshToken } = require('@utils/refreshToken');
const User = require('@models/User'); // Necesario para actualizar el refreshToken en la BD
const { apiLogger } = require('@utils/logger');
const router = express.Router();

/**
 * Manejador de Callback para OAuth (Google/Facebook)
 */
const handleOAuthCallback = async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = generateRefreshToken(user.id);
        
        // Guardar el refreshToken en la base de datos
        await User.findByIdAndUpdate(user.id, { refreshToken });

        res.json({ refreshToken });
    } catch (error) {
        apiLogger.error(`[authRoutes] - [handOAuthCallback]: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: 'Error al procesar la autenticación con Google.' });
    }
};

// Rutas principales de autenticación
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

// Rutas de autenticación con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), handleOAuthCallback);

// Rutas de autenticación con Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), handleOAuthCallback);

module.exports = router;
