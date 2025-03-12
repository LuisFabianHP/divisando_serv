const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Verificar que el directorio logs existe, si no, crearlo
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Logger para la API
const apiLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.File({ filename: path.join(logDir, 'api.log'), level: 'info' }), // Logs informativos
    new transports.File({ filename: path.join(logDir, 'api-errors.log'), level: 'error' }), // Logs de errores
  ],
});

// Logger para las tareas
const taskLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.File({ filename: path.join(logDir, 'tasks.log'), level: 'info' }), // Logs informativos
    new transports.File({ filename: path.join(logDir, 'task-errors.log'), level: 'error' }), // Logs de errores
  ],
});

// Solo en desarrollo, loggear en la consola
if (process.env.NODE_ENV !== 'production') {
  apiLogger.add(new transports.Console({ format: combine(timestamp(), logFormat) }));
  taskLogger.add(new transports.Console({ format: combine(timestamp(), logFormat) }));
}

module.exports = { apiLogger, taskLogger };