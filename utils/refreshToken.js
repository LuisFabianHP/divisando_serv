const jwt = require('jsonwebtoken');

// Genera un Refresh Token con expiración
const generateRefreshToken = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); // Expira en 7 días
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Sumar 7 días

  return { token, expiresAt };
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
