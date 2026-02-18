require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB, closeDB } = require("@config/database");
const { scheduleExchangeRates, stopExchangeRates } = require("@tasks/fetchExchangeRates");
const { scheduleCleanup, stopCleanup } = require("@tasks/cleanupUnverifiedUsers");
const { scheduleMemoryMonitor, stopMemoryMonitor } = require("@tasks/memoryMonitor");
const { scheduleGarbageCollector, stopGarbageCollector } = require("@tasks/garbageCollector");
const apiRateLimiter = require("@middlewares/rateLimiter");
const { closeLoggers } = require("@utils/logger");
const { createGracefulShutdown } = require("@utils/gracefulShutdown");
const dotenv = require('dotenv');
const PORT = process.env.PORT || 8080;
const API_NAME = process.env.API_NAME;

const serverRef = { current: null };
let memoryLogInterval = null;

// Conectar a la base de datos
connectDB()
.then(() => {
  // Verifica si estamos en producción o desarrollo
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console.log(`🚀 ${API_NAME} - Servidor corriendo en \x1b[35mMODO PRODUCCIÓN\x1b[0m`);
  } else {
    dotenv.config({ path: 'development.env' });
    console.log(`🛠️  ${API_NAME} - Servidor corriendo en \x1b[34mMODO DESARROLLO\x1b[0m`);
  }

  // Iniciar servidor HTTP (Railway maneja HTTPS automáticamente)
  serverRef.current = http.createServer(app).listen(PORT, () => {
    console.log(`✅ Servidor escuchando en el puerto \x1b[36m${PORT}\x1b[0m`);
    scheduleCleanup(); // Tarea de limpieza de usuarios no verificados
    scheduleMemoryMonitor(); // Monitoreo de memoria cada 5min
    scheduleGarbageCollector(); // Garbage collection cada 30min
    scheduleExchangeRates(); // Tarea de tasas de cambio por cron

    const enableAggressiveMemoryLog = String(process.env.MEMORY_LOG_ENABLED || '').toLowerCase() === 'true';
    if (enableAggressiveMemoryLog) {
      const intervalMs = Number(process.env.MEMORY_LOG_INTERVAL_MS || '10000');
      if (Number.isFinite(intervalMs) && intervalMs >= 1000) {
        memoryLogInterval = setInterval(() => {
          const usage = process.memoryUsage();
          const heapUsedMB = (usage.heapUsed / 1024 / 1024).toFixed(2);
          const heapTotalMB = (usage.heapTotal / 1024 / 1024).toFixed(2);
          const heapPercent = ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2);
          const rssMB = (usage.rss / 1024 / 1024).toFixed(2);
          const externalMB = (usage.external / 1024 / 1024).toFixed(2);

          console.log(
            `[MEM] Heap: ${heapUsedMB}MB/${heapTotalMB}MB (${heapPercent}%) | RSS: ${rssMB}MB | External: ${externalMB}MB`
          );
        }, intervalMs);
      } else {
        console.warn('⚠️ MEMORY_LOG_INTERVAL_MS invalido. Debe ser >= 1000.');
      }
    }
  });
})
.catch((error) => {
  console.error("❌ Error crítico al iniciar el servidor:", error.message);
});

const gracefulShutdown = createGracefulShutdown({
  serverRef,
  stopJobs: () => {
    stopExchangeRates();
    stopCleanup();
    stopMemoryMonitor();
    stopGarbageCollector();
  },
  clearMemoryLog: () => {
    if (memoryLogInterval) {
      clearInterval(memoryLogInterval);
      memoryLogInterval = null;
    }
  },
  rateLimiterStore: apiRateLimiter.store,
  closeLoggers,
  closeDB,
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
