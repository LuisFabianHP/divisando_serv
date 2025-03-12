const { apiLogger } = require('@utils/logger');

const errorHandler = (err, req, res, next) => {
    // Control del código de status
    const statusCode = err.status || err.statusCode || 500;    
    // Mensaje corto para el usuario
    const userMessage = err.userMessage || 'Algo salió mal. Por favor, intenta nuevamente.';

    // Detalles técnicos para desarrolladores
    const developerMessage = {
      status: statusCode,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      route: req?.originalUrl || 'Ruta no disponible',
      taskName: err.taskName || 'No especificado'
    };
  
    // Registrar en los logs
    if (statusCode >= 500) {
        apiLogger.error(developerMessage.message, developerMessage); // Error crítico
    } else {
        apiLogger.warn(developerMessage.message, developerMessage);  // Advertencia
    }

    // Responder al cliente
    if (!res.headersSent) {
      res.status(statusCode).json({ error: userMessage });
    } else {
      console.error('❌ Error fuera del flujo HTTP:', developerMessage);
    }
};
  
module.exports = errorHandler;
