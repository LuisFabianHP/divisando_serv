/**
 * SOLO PARA TEST: Permite resetear el estado de conexión y circuit breaker.
 * Mantener este código en futuros merges desde dev.
 */
function resetConnectionState() {
  connectionStatus = 'disconnected';
  lastConnectionAttempt = null;
  consecutiveFailures = 0;
}

const mongoose = require('mongoose');
const { normalizeEnvValue } = require('../utils/envNormalizer');

let connectionStatus = 'disconnected'; // Estados: disconnected, connecting, connected, failed
let lastConnectionAttempt = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto

/**
 * Obtiene el tipo de error de MongoDB
 * @param {Error} error - Error capturado
 * @returns {Object} Información del error categorizada
 */
const categorizeMongoError = (error) => {
  const errorInfo = {
    type: 'unknown',
    message: error.message,
    retryable: true
  };

  // Errores de autenticación
  if (error.message.includes('Authentication failed') || error.name === 'MongoAuthError') {
    errorInfo.type = 'authentication';
    errorInfo.message = 'Error de autenticación: Credenciales de MongoDB inválidas';
    errorInfo.retryable = false;
  }
  // Errores de red
  else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
    errorInfo.type = 'network';
    errorInfo.message = 'Error de red: No se puede alcanzar el servidor de MongoDB';
  }
  // Timeout
  else if (error.message.includes('timed out') || error.name === 'MongoTimeoutError') {
    errorInfo.type = 'timeout';
    errorInfo.message = 'Timeout: MongoDB no respondió en el tiempo esperado';
  }
  // DNS
  else if (error.message.includes('ENOTFOUND')) {
    errorInfo.type = 'dns';
    errorInfo.message = 'Error DNS: No se puede resolver el hostname de MongoDB';
    errorInfo.retryable = false;
  }
  // Errores de configuración
  else if (error.message.includes('bad auth') || error.message.includes('Invalid scheme')) {
    errorInfo.type = 'configuration';
    errorInfo.message = 'Error de configuración: URI de MongoDB inválida';
    errorInfo.retryable = false;
  }

  return errorInfo;
};

/**
 * Verifica si el circuit breaker está abierto
 * @returns {boolean}
 */
const isCircuitBreakerOpen = () => {
  if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) return false;
  
  const timeSinceLastAttempt = Date.now() - lastConnectionAttempt;
  if (timeSinceLastAttempt > CIRCUIT_BREAKER_TIMEOUT) {
    console.log('🔄 Circuit breaker: Reintentando después del timeout');
    consecutiveFailures = 0;
    return false;
  }
  
  return true;
};

const connectDB = async (retries = 5, initialDelay = 3000, connectionTimeout = 10000) => {
  // Verificar circuit breaker
  if (isCircuitBreakerOpen()) {
    const waitTime = Math.round((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastConnectionAttempt)) / 1000);
    console.log(`🚫 Circuit breaker ABIERTO: Esperando ${waitTime}s antes de reintentar`);
    throw new Error(`Circuit breaker activo. Esperando ${waitTime}s antes de reintentar.`);
  }

  connectionStatus = 'connecting';
  lastConnectionAttempt = Date.now();
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const mongoUri = normalizeEnvValue(process.env.MONGO_URI);

      if (!mongoUri) {
        throw new Error('MONGO_URI no está definida en las variables de entorno');
      }

      mongoose.set('strictQuery', false);
      
  // Pool configurable: usa MONGO_MAX_POOL_SIZE y MONGO_MIN_POOL_SIZE de .env o valores por defecto
  const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10);
  const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10);
  const maxIdleTimeMS = parseInt(process.env.MONGO_MAX_IDLE_MS || '60000', 10);
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: connectionTimeout,
        socketTimeoutMS: connectionTimeout * 4.5,
        maxPoolSize,
        minPoolSize,
        maxIdleTimeMS,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      connectionStatus = 'connected';
      consecutiveFailures = 0; // Reset en conexión exitosa
      return conn;

    } catch (error) {
      const errorInfo = categorizeMongoError(error);
      
      // Solo mostrar mensaje descriptivo en consola
      console.error(`❌ [Intento ${attempt}/${retries}] Error de conexión (${errorInfo.type}): ${errorInfo.message}`);

      // Si el error no es reintentar, fallar inmediatamente
      if (!errorInfo.retryable) {
        console.error(`🛑 Error no recuperable. Abortando intentos de conexión.`);
        connectionStatus = 'failed';
        consecutiveFailures = MAX_CONSECUTIVE_FAILURES;
        throw error;
      }

      // Si quedan intentos, aplicar backoff exponencial
      if (attempt < retries) {
        console.log(`⏳ Reintentando en ${currentDelay / 1000}s... (backoff exponencial)`);
        await new Promise((res) => setTimeout(res, currentDelay));
        currentDelay *= 2; // Duplicar delay para próximo intento (3s, 6s, 12s, 24s)
      } else {
        // Agotar intentos
        console.error('💥 No se pudo conectar a MongoDB después de múltiples intentos.');
        connectionStatus = 'failed';
        consecutiveFailures++;
        
        if (normalizeEnvValue(process.env.NODE_ENV).toLowerCase() === 'production') {
          process.exit(1); // En producción, detener servidor
        } else {
          throw new Error(`Conexión a MongoDB falló después de ${retries} intentos: ${errorInfo.message}`);
        }
      }
    }
  }
};

// Cerrar la conexión con la base de datos
const closeDB = async () => {
  await mongoose.connection.close();
  connectionStatus = 'disconnected';
};

/**
 * Obtiene el estado actual de la conexión a MongoDB
 * @returns {Object} Estado de conexión con detalles
 */
const getConnectionStatus = async () => {
  const status = {
    status: connectionStatus,
    readyState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    host: mongoose.connection.host || 'N/A',
    consecutiveFailures,
    circuitBreakerOpen: isCircuitBreakerOpen(),
    ping: null
  };

  // Medir latencia solo si está conectado
  if (mongoose.connection.readyState === 1) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      status.ping = Date.now() - startTime;
    } catch (error) {
      status.ping = 'error';
      status.pingError = error.message;
    }
  }

  return status;
};

module.exports = { connectDB, closeDB, getConnectionStatus, resetConnectionState };