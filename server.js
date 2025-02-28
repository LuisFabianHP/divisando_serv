require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = require('./app');
const { connectDB } = require('@config/database');
const updateExchangeRates = require('@tasks/fetchExchangeRates');

const PORT = process.env.PORT;
const API_NAME = process.env.API_NAME;

// Conectar a la base de datos
connectDB().then(() => {  
  // Verifica si estamos en desarrollo o producción
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Leer el certificado y la clave
    const sslOptions = {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.cert'),
    };

    //Iniciar y configurar servidor HTTPS
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`🚀  ${API_NAME}  -  Servidor HTTPS corriendo...`);
      // Iniciar el cron job
      updateExchangeRates(); 
    });
  } else {
    http.createServer(app).listen(PORT, process.env.API_DOMAINS_TEST,() => {
      console.log(`🛠️  ${API_NAME}  -  Servidor HTTP de PRUEBAS corriendo...`);
      // Iniciar el cron job
      updateExchangeRates(); 
    });
  }
})
.catch((error) => {
  console.error('Error crítico al iniciar el servidor:', error.message);
});
