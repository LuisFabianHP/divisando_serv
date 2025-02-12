const express = require('express');
const passport = require('passport');
const { login, register, refreshAccessToken, logout } = require('@controllers/authController');
const { generateJWT } = require('@utils/generateJWT');
const router = express.Router();

const handleOAuthCallback = (req, res) => {
    const token = generateJWT(req.user.id, req.user.role);
    res.json({ accessToken: token });
};

// Rutas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

// Ruta para iniciar sesión con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Callback de Google
router.get('/google/callback', passport.authenticate('google', { session: false }), handleOAuthCallback);

// Ruta para iniciar sesión con Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
// Callback de Facebook
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), handleOAuthCallback);

module.exports = router;

