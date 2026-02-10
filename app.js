require('module-alias/register');
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
//Middlewares
const errorHandler = require('@middlewares/errorHandler');
const validateApiKey = require('@middlewares/validateApiKey');
const validateUserAgent = require('@middlewares/validateUserAgent'); 
const apiRateLimiter = require('@middlewares/rateLimiter');
//Requerimientos passaport
const passport = require('passport');
require('@config/passportGoogle');
require('@config/passportFacebook');
const app = express();
// Importando la rutas
const exchangeRoutes = require('@routes/exchangeRoutes');
const authRoutes = require('@routes/authRoutes');
const healthRoutes = require('@routes/healthRoutes');
const getSiteIP = require('@tasks/getSiteIP');
// Configurar CORS
const originValues = process.env.API_CROS_DOMAINS.split(',').map(item => item.trim());
const corsOptions = {
  origin: originValues, // Dominios autorizados
  methods: ['GET', 'POST'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'x-api-key'], // Encabezados permitidos
};

// Middlewares básicos
app.use(helmet()); // Seguridad básica
app.use(cors(corsOptions));   // Manejo de CORS
app.use(express.json()); // Parseo de JSON
app.use(validateApiKey); // Validar clave API antes de las rutas
app.use(validateUserAgent); // Validar User-Agent

// Aplicar el middleware a todas las rutas de la API
app.use('/exchange', apiRateLimiter); 

// Rutas
app.use('/exchange', exchangeRoutes);
app.use('/auth', authRoutes);
app.use('/api', healthRoutes);
app.use('/script', getSiteIP);

//Esto carga las estrategias y hace que Passport esté disponible en la API.
app.use(passport.initialize());

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.status = 404;
  error.userMessage = 'La ruta solicitada no existe.';
  next(error);
});

// Omitir /favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Middlewares manejo de errores
app.use(errorHandler);

module.exports = app;
