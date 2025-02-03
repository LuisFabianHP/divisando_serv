const jwt = require('jsonwebtoken');

// Genera un Refresh Token con expiración
const generateRefreshToken = (id) => {
  try {
    const payload = { id };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Valor por defecto de 7 días
    });
    return refreshToken;
  } catch (error) {
    console.error('Error al generar el Refresh Token:', error);
    throw error; // Lanza el error para manejarlo en el controlador
  }
};

// Validar un Refresh Token
const validateRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateRefreshToken, validateRefreshToken };
