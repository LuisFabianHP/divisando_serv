const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(helmet()); // Seguridad básica
app.use(cors());   // Manejo de CORS
app.use(express.json()); // Parseo de JSON

// Rutas
//const currencyRoutes = require('./routes/currencyRoutes');
//app.use('/api/currencies', currencyRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
