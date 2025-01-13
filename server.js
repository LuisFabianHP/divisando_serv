require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const updateExchangeRates = require('./tasks/fetchExchangeRates');

const PORT = process.env.PORT;

// Conectar a la base de datos
connectDB();

// Iniciar el cron job
updateExchangeRates(); // Ejecuta manualmente la función

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
