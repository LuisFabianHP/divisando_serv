const jwt = require('jsonwebtoken');
const { apiLogger } = require('@utils/logger');

/**
 * Genera un Refresh Token con expiración.
 * @param {string} id - ID del usuario.
 * @returns {string} - Refresh Token generado.
 */
const generateRefreshToken = (id) => {
  try {
    const payload = { id };
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d', // Por defecto 7 días
    });
    return refreshToken;
  } catch (error) {
    apiLogger.error('Error al generar el Refresh Token', { error: error.message });
    throw new Error('No se pudo generar el Refresh Token.');
  }
};

/**
 * Valida un Refresh Token.
 * @param {string} token - Refresh Token recibido.
 * @returns {Object} - Payload decodificado si es válido.
 * @throws {Error} - Lanza error si el token no es válido o expiró.
 */
const validateRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    apiLogger.warn('Refresh Token inválido o expirado', { error: error.message });
    throw new Error('Refresh Token inválido o expirado.');
  }
};

module.exports = { generateRefreshToken, validateRefreshToken };
