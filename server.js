require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("@config/database");
const updateExchangeRates = require("@tasks/fetchExchangeRates");

const PORT = process.env.PORT || 3000;
const API_NAME = process.env.API_NAME;

// Conectar a la base de datos
connectDB()
.then(() => {
  // Verifica si estamos en producción o desarrollo
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console.log(`🚀 ${API_NAME} - Servidor corriendo en MODO PRODUCCIÓN`);
  } else {
    console.log(`🛠️ ${API_NAME} - Servidor corriendo en MODO DESARROLLO`);
  }

  // Iniciar servidor HTTP (Railway maneja HTTPS automáticamente)
  http.createServer(app).listen(PORT, () => {
    console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
    updateExchangeRates(); // Mantener la tarea automática
  });
})
.catch((error) => {
  console.error("❌ Error crítico al iniciar el servidor:", error.message);
});
