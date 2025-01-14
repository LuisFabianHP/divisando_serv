const errorHandler = (err, req, res, next) => {
    // Mensaje corto para el usuario
    const userMessage = err.userMessage || 'Algo salió mal. Por favor, intenta nuevamente.';
  
    // Detalles técnicos para desarrolladores
    const developerMessage = {
      status: err.status || 500,
      message: err.message,
      stack: err.stack,
      route: req.originalUrl,
    };
  
    // Registrar en la consola o sistema de logs
    console.error('Error Detalles:', developerMessage);
  
    // Responder al usuario
    res.status(developerMessage.status).json({ error: userMessage });
  };
  
  module.exports = errorHandler;
  