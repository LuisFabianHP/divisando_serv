const express = require('express');
const { getExchangeRates, getComparisonData, getAvailableCurrencies } = require('@controllers/exchangeController');
const validateJWT = require('@middlewares/validateJWT');
const router = express.Router();


// Nueva ruta para obtener monedas disponibles (protegido con JWT)
router.get('/currencies', validateJWT, getAvailableCurrencies);

// Endpoint para comparar monedas (protegido con JWT)
router.get('/compare', validateJWT, getComparisonData);

// Ruta para obtener las tasas de cambio (protegido con JWT)
router.get('/:currency', validateJWT, getExchangeRates);

module.exports = router;
