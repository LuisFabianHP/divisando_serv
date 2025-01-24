const jwt = require('jsonwebtoken');

// Generar un token JWT
const generateJWT = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h', // El token expira en 1 hora
    });
};

module.exports = generateJWT;
