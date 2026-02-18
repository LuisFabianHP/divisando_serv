const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Verificar que el directorio logs existe, si no, crearlo
const logDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error('❌ Error al crear directorio de logs:', err.message);
}

// Utilidad para formatear fecha a 'YYYY-MM-DD HH:mm:ss' con JS puro
function formatDate(dateString) {
  const date = new Date(dateString);
  const pad = n => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const friendlyTime = formatDate(timestamp);
  return `${friendlyTime} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Crear transports de forma segura
const createTransports = () => {
  const transportsList = [];
  
  try {
    transportsList.push(
      new transports.File({ 
        filename: path.join(logDir, 'api.log'), 
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
    transportsList.push(
      new transports.File({ 
        filename: path.join(logDir, 'api-errors.log'), 
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  } catch (err) {
    console.error('❌ Error al crear transports de archivos:', err.message);
  }
  
  // Siempre agregar console logging en producción para debug
  transportsList.push(
    new transports.Console({
      format: combine(timestamp(), logFormat),
      level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    })
  );
  
  return transportsList;
};

// Logger para la API
const apiLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: createTransports(),
  exceptionHandlers: [
    new transports.Console({ format: combine(timestamp(), logFormat) }),
  ],
});

// Logger para las tareas
const taskLogger = createLogger({
  level: 'info',
  format: combine(timestamp(), logFormat),
  transports: createTransports(),
  exceptionHandlers: [
    new transports.Console({ format: combine(timestamp(), logFormat) }),
  ],
});

// Función para cerrar loggers de manera elegante (limpia file handles)
const closeLoggers = () => {
  return Promise.all([
    new Promise((resolve) => apiLogger.close(() => resolve())),
    new Promise((resolve) => taskLogger.close(() => resolve())),
  ]);
};

module.exports = { apiLogger, taskLogger, closeLoggers };