const express = require('express');
const { getExchangeRates, getComparisonData } = require('../controllers/exchangeController');
const router = express.Router();

// Endpoint para comparar monedas
router.get('/compare', getComparisonData);

// Ruta para obtener las tasas de cambio
router.get('/:currency', getExchangeRates);

module.exports = router;
