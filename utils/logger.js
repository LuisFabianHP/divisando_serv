const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Logger para la API
const apiLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.File({ filename: 'logs/api.log', level: 'info' }), // Logs informativos
    new transports.File({ filename: 'logs/api-errors.log', level: 'error' }), // Logs de errores
  ],
});

// Logger para las tareas
const taskLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.File({ filename: 'logs/tasks.log', level: 'info' }), // Logs informativos
    new transports.File({ filename: 'logs/task-errors.log', level: 'error' }), // Logs de errores
  ],
});

module.exports = { apiLogger, taskLogger };
