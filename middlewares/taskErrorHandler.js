const { taskLogger } = require('@utils/logger');

/**
 * Middleware para manejar errores en tareas.
 * @param {Function} task - La tarea que se desea ejecutar.
 * @param {string} taskName - Nombre de la tarea para identificarla en los logs.
 * @returns {Function} - Una función que maneja los errores de la tarea.
 */
const taskErrorHandler = (task, taskName = 'Tarea Desconocida') => async (...args) => {
  try {
    await task(...args); // Ejecuta la tarea
  } catch (error) {
    const developerMessage = {
      status: error.status || 500,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      taskName
    };

    // Log del error en el archivo correspondiente
    if (developerMessage.status >= 500) {
      taskLogger.error(developerMessage.message, developerMessage); // Error crítico
    } else {
      taskLogger.warn(developerMessage.message, developerMessage); // Advertencia
    }

    // Opcional: Mostrar el error en la consola (solo para desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error en la tarea:', developerMessage);
    }
  }
};

module.exports = taskErrorHandler;
