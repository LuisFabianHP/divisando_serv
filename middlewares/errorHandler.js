const { apiLogger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Mensaje corto para el usuario
    const userMessage = err.userMessage || 'Algo salió mal. Por favor, intenta nuevamente.';
    
    // Detalles técnicos para desarrolladores
    const developerMessage = {
      status: err.status || 500,
      message: err.message,
      stack: err.stack,
      route: req?.originalUrl || 'Ruta no disponible',
    };
  
    // Registrar en los logs
    if (developerMessage.status >= 500) {
      apiLogger.error(JSON.stringify(developerMessage)); // Error crítico
    } else {
      apiLogger.warn(JSON.stringify(developerMessage)); // Advertencia
    }

    // Responder al cliente
    if (res && typeof res.status === 'function') {
      res.status(developerMessage.status).json({ error: userMessage });
    } else {
      console.error('Error fuera del flujo HTTP:', developerMessage);
    }
  };
  
  module.exports = errorHandler;
  