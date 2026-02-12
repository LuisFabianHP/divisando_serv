require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB, closeDB } = require("@config/database");
const { scheduleExchangeRates, stopExchangeRates } = require("@tasks/fetchExchangeRates");
const { scheduleCleanup, stopCleanup } = require("@tasks/cleanupUnverifiedUsers");
const { scheduleMemoryMonitor, stopMemoryMonitor } = require("@tasks/memoryMonitor");
const { scheduleGarbageCollector, stopGarbageCollector } = require("@tasks/garbageCollector");
const dotenv = require('dotenv');
const PORT = process.env.PORT || 8080;
const API_NAME = process.env.API_NAME;

let server = null;

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
  server = http.createServer(app).listen(PORT, () => {
    console.log(`✅ Servidor escuchando en el puerto \x1b[36m${PORT}\x1b[0m`);
    scheduleCleanup(); // Tarea de limpieza de usuarios no verificados
    scheduleMemoryMonitor(); // Monitoreo de memoria cada 5min
    scheduleGarbageCollector(); // Garbage collection cada 30min
    scheduleExchangeRates(); // Tarea de tasas de cambio por cron
  });
})
.catch((error) => {
  console.error("❌ Error crítico al iniciar el servidor:", error.message);
});

const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal}: Cerrando servidor y tareas...`);
  stopExchangeRates();
  stopCleanup();
  stopMemoryMonitor();
  stopGarbageCollector();

  if (server) {
    server.close(() => {
      closeDB().finally(() => process.exit(0));
    });
  } else {
    closeDB().finally(() => process.exit(0));
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
