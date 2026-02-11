const jwt = require('jsonwebtoken');
const { apiLogger } = require('@utils/logger');

/**
 * Genera un token JWT para autenticación.
 * @param {string} id - ID del usuario.
 * @param {string} role - Rol del usuario.
 * @returns {string|null} Token JWT generado o null en caso de error.
 */
const generateJWT = (id, role) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Falta la clave JWT_SECRET en las variables de entorno.');
    }

    const payload = { id, role };
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Tiempo de expiración configurable
    });

  } catch (error) {
    apiLogger.error('Error al generar el JWT', {
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
    return null; // Retorna null en lugar de lanzar el error
  }
};

module.exports = generateJWT;
