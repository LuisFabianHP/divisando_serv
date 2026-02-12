require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("@config/database");
const updateExchangeRates = require("@tasks/fetchExchangeRates");
const scheduleUserCleanup = require("@tasks/cleanupUnverifiedUsers");
const memoryMonitor = require("@tasks/memoryMonitor");
const garbageCollector = require("@tasks/garbageCollector");
const dotenv = require('dotenv');
const PORT = process.env.PORT || 8080;
const API_NAME = process.env.API_NAME;

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
  http.createServer(app).listen(PORT, () => {
    console.log(`✅ Servidor escuchando en el puerto \x1b[36m${PORT}\x1b[0m`);
    scheduleUserCleanup(); // Tarea de limpieza de usuarios no verificados
    memoryMonitor(); // Monitoreo de memoria cada 5min
    garbageCollector(); // Garbage collection cada 30min
  });
})
.catch((error) => {
  console.error("❌ Error crítico al iniciar el servidor:", error.message);
});
