const express = require('express');
const { login, register, refreshAccessToken, logout } = require('@controllers/authController');
const router = express.Router();

// Rutas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

module.exports = router;

