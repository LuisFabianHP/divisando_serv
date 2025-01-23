const apiLogger = require('@utils/logger').apiLogger;

const validateUserAgent = (req, res, next) => {
  const userAgent = req.headers['user-agent'];

  // Lista de User-Agents permitidos
  const allowedUserAgents = ['MiAplicacionMovil/1.0'];

  if (!userAgent || !allowedUserAgents.includes(userAgent)) {
    apiLogger.error('User-Agent no autorizado o no especificado.');
    const error = new Error('User-Agent no autorizado.');
    error.status = 403;
    return next(error);
  }

  next();
};

module.exports = validateUserAgent;
