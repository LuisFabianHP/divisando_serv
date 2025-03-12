const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Ventana de 1 minuto
  max: 50, // Máximo de 50 solicitudes por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, inténtalo de nuevo después de 1 minuto.',
  },
  standardHeaders: true, // Habilita los headers estándar RateLimit
  legacyHeaders: false, // Desactiva headers X-RateLimit
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip, // Mejor manejo de IPs en proxys
  handler: (req, res, next) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) || 60;

    res.set('Retry-After', retryAfter); // Agrega header útil para clientes

    const error = new Error('Demasiadas solicitudes desde esta IP.');
    error.status = 429;
    error.userMessage = `Has excedido el límite de solicitudes. Intenta de nuevo en ${Math.ceil(retryAfter)} segundos.`;
    error.route = req.originalUrl;

    next(error);
  }
});

module.exports = apiRateLimiter;
