const express = require('express');
const { login, register, refreshAccessToken } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

module.exports = router;

