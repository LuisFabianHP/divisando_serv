const { taskLogger } = require('@utils/logger');

/**
 * Middleware para manejar errores en tareas.
 * @param {Function} task - La tarea que se desea ejecutar.
 * @returns {Function} - Una función que maneja los errores de la tarea.
 */
const taskErrorHandler = (task) => async (...args) => {
  try {
    await task(...args); // Ejecuta la tarea
  } catch (error) {
    const developerMessage = {
      status: error.status || 500,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // Log del error en el archivo correspondiente
    if (developerMessage.status >= 500) {
      taskLogger.error(JSON.stringify(developerMessage)); // Error crítico
    } else {
      taskLogger.info(JSON.stringify(developerMessage)); // Error menor
    }

    // Opcional: Mostrar el error en la consola (solo para desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en la tarea:', developerMessage);
    }
  }
};

module.exports = taskErrorHandler;
