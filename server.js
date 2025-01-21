require('dotenv').config();
const https = require('https');
const fs = require('fs');
const app = require('./app');
const connectDB = require('./config/database');
const updateExchangeRates = require('./tasks/fetchExchangeRates');

const PORT = process.env.PORT;
const APP_NAME = process.env.APP_NAME;

// Conectar a la base de datos
connectDB();

// Iniciar el cron job
updateExchangeRates(); // Ejecuta manualmente la función

// Leer el certificado y la clave
const sslOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
};

//Iniciar y configurar servidor HTTPS
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`${API_NAME}  -  Servidor HTTPS corriendo...`);
});