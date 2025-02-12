const { apiLogger } = require('@utils/logger');

const validateUserAgent = (req, res, next) => {
  const userAgent = req.headers['user-agent'];

  // Lista de User-Agents permitidos, configurable desde .env
  const allowedUserAgents = (process.env.API_ALLOWED_USER_AGENTS || 'MiAplicacionMovil/1.0').split(',');

  if (!userAgent || !allowedUserAgents.includes(userAgent)) {
    const error = new Error('User-Agent no autorizado.');
    error.status = 403;

    apiLogger.warn({
      message: 'Intento de acceso con User-Agent no permitido.',
      route: req.originalUrl,
      receivedUserAgent: userAgent || 'No especificado',
    });

    return next(error);
  }

  next();
};

module.exports = validateUserAgent;

