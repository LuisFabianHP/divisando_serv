const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const validateApiKey = require('./middlewares/validateApiKey');
require('dotenv').config();

const app = express();

// Importando la rutas
const exchangeRoutes = require('./routes/exchangeRoutes'); 

// Middlewares básicos
app.use(helmet()); // Seguridad básica
app.use(cors());   // Manejo de CORS
app.use(express.json()); // Parseo de JSON
app.use(validateApiKey); // Validar clave API antes de las rutas

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
