const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const validateApiKey = require('./middlewares/validateApiKey');
const validateUserAgent = require('./middlewares/validateUserAgent'); 
require('dotenv').config();

const app = express();

// Importando la rutas
const exchangeRoutes = require('./routes/exchangeRoutes'); 

// Configurar CORS
const corsOptions = {
  origin: ['https://mi-aplicacion-movil.com', 'http://localhost:3000'], // Dominios autorizados
  methods: ['GET', 'POST'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'x-api-key'], // Encabezados permitidos
};

// Middlewares básicos
app.use(helmet()); // Seguridad básica
app.use(cors(corsOptions));   // Manejo de CORS
app.use(express.json()); // Parseo de JSON
app.use(validateApiKey); // Validar clave API antes de las rutas
app.use(validateUserAgent); // Validar User-Agent

// Rutas
app.use('/exchange', exchangeRoutes);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.status = 404;
  error.userMessage = 'La ruta solicitada no existe.';
  next(error);
});

// Middlewares manejo de errores
app.use(errorHandler);

module.exports = app;
