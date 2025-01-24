const rateLimit = require('express-rate-limit');

// Configuración general de Rate Limiting con un tiempo de penalización
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
  max: 50, // Límite de 100 solicitudes por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, inténtalo de nuevo después de 1 minutos.',
  },
  standardHeaders: true, // Devuelve información en los encabezados estándar de RateLimit
  legacyHeaders: false, // Deshabilita los encabezados X-Ratelimit
  handler: (req, res, next) => {
        // Crear un error personalizado
        const error = new Error('Demasiadas solicitudes desde esta IP.');
        error.status = 429;
        error.userMessage = 'Has excedido el límite de solicitudes. Intenta de nuevo en 1 minuto.';
        error.route = req.originalUrl;

        // Pasar el error al middleware de manejo de errores
        next(error);
  }
});

module.exports = apiRateLimiter;
