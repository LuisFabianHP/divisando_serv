require('dotenv').config();
const jwt = require('jsonwebtoken');

const generateJWT = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h', // El token expira en 1 hora
    });
};

const validateJWT = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token válido. Datos decodificados:', decoded);
    } catch (err) {
        console.error('Token inválido o expirado:', err.message);
    }
};

const token = generateJWT({ username: 'admin' });
console.log('Token generado:', token);

// Validar el token generado
validateJWT(token);

// Prueba con un token inválido
validateJWT('token_invalido');

