const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('@models/User');
const { generateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');
const { 
    login,
    loginWithGoogle,
    loginWithApple,
    register, 
    refreshAccessToken, 
    logout,
    verificationCode, 
    resendVerificationCode,
    forgotPassword,
    resetPassword
} = require('@controllers/authController');

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
router.post('/google', loginWithGoogle); // Endpoint para mobile/Flutter (Google)
router.post('/apple', loginWithApple); // Endpoint para mobile/Flutter (Apple)
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/code/verification', verificationCode);
router.post('/code/resend', resendVerificationCode);
router.post('/password/forgot', forgotPassword);
router.post('/password/reset', resetPassword);

// Rutas de autenticación con Google (web)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), handleOAuthCallback);

// Rutas de autenticación con Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), handleOAuthCallback);

module.exports = router;
