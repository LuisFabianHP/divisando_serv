const jwt = require('jsonwebtoken');

// Generar un token JWT
const generateJWT = (id, role) => {
  try {
    const payload = { id, role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Valor por defecto de 1 hora
    });
    return token;
  } catch (error) {
    console.error('Error al generar el JWT:', error);
    throw error; // Lanza el error para que sea manejado por el controlador
  }
};

module.exports = generateJWT;
