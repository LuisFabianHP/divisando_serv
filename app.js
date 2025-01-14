const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
require('dotenv').config();

const app = express();

// Importando la rutas
const exchangeRoutes = require('./routes/exchangeRoutes'); 

// Middlewares básicos
app.use(helmet()); // Seguridad básica
app.use(cors());   // Manejo de CORS
app.use(express.json()); // Parseo de JSON

// Rutas
app.use('/exchange', exchangeRoutes);

// Manejo de errores
app.use((req, res) => {
  if (req.status == 500) {
    const error = new Error(err.stack);
    error.status = 500;
    error.userMessage = 'Something went wrong!';
    throw error;
  }
});

app.use((req, res) => {
  const error = new Error(err.stack);
  error.status = 400;
  error.userMessage = `Ruta no encontrada: ${req.originalUrl}`;
  throw error;
});

// Middlewares manejo de errores
app.use(errorHandler);

module.exports = app;
