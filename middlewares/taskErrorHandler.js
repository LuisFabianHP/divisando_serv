const { taskLogger } = require('../utils/logger');

/**
 * Middleware para manejar errores en tareas.
 * @param {Function} task - La tarea que se desea ejecutar.
 * @returns {Function} - Una función que maneja los errores de la tarea.
 */
const taskErrorHandler = (task) => async (...args) => {
  try {
    await task(...args); // Ejecuta la tarea
  } catch (error) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // Log del error en el archivo correspondiente
    taskLogger.error(JSON.stringify(errorDetails));

    // Opcional: Mostrar el error en la consola (solo para desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error en la tarea:', errorDetails);
    }
  }
};

module.exports = taskErrorHandler;
