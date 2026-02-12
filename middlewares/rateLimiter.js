const rateLimit = require('express-rate-limit');

// Store en memoria optimizado para Railway (límite de heap)
// Para planes mejorados: aumentar RATE_LIMIT_STORE_MAX_ENTRIES en .env
class LimitedMemoryStore {
  constructor(maxEntries = 5000) {
    this.hits = new Map();
    this.maxEntries = maxEntries;
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Limpieza cada 5min
  }

  increment(key) {
    // Si alcanzamos el límite, eliminar entradas antiguas
    if (this.hits.size >= this.maxEntries) {
      const firstKey = this.hits.keys().next().value;
      this.hits.delete(firstKey);
    }

    const record = this.hits.get(key) || { 
      totalHits: 0, 
      resetTime: new Date(Date.now() + 60000) // Date object para compatibilidad con express-rate-limit
    };
    record.totalHits++;
    this.hits.set(key, record);
    return {
      totalHits: record.totalHits,
      resetTime: record.resetTime
    };
  }

  decrement(key) {
    const record = this.hits.get(key);
    if (record && record.totalHits > 0) {
      record.totalHits--;
      this.hits.set(key, record);
    }
  }

  resetKey(key) {
    this.hits.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      const resetTimestamp = record.resetTime instanceof Date 
        ? record.resetTime.getTime() 
        : record.resetTime;
      if (resetTimestamp < now) {
        this.hits.delete(key);
      }
    }
  }

  shutdown() {
    clearInterval(this.cleanupInterval);
  }
}

// Configurable para escalar: plan gratuito=5000, plan pro=10000+
const MAX_STORE_ENTRIES = parseInt(process.env.RATE_LIMIT_STORE_MAX_ENTRIES || '5000', 10);
const store = new LimitedMemoryStore(MAX_STORE_ENTRIES);

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Ventana de 1 minuto
  max: 50, // Máximo de 50 solicitudes por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, inténtalo de nuevo después de 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  handler: (req, res, next) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000) || 60;
    res.set('Retry-After', retryAfter);

    const error = new Error('Demasiadas solicitudes desde esta IP.');
    error.status = 429;
    error.userMessage = `Has excedido el límite de solicitudes. Intenta de nuevo en ${Math.ceil(retryAfter)} segundos.`;
    error.route = req.originalUrl;

    next(error);
  }
});

module.exports = apiRateLimiter;
