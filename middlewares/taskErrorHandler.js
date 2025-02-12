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
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    };

    // Loguear el error con prioridad adecuada
    if (developerMessage.status >= 500) {
      taskLogger.error(developerMessage.message, developerMessage);
    } else {
      taskLogger.warn(developerMessage.message, developerMessage);
    }

    // Opcional: Mostrar el error en la consola en modo desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en la tarea:', developerMessage);
    }
  }
};

module.exports = taskErrorHandler;
