const express = require('express');
const { getExchangeRates } = require('../controllers/exchangeController');
const router = express.Router();

// Ruta para obtener las tasas de cambio
router.get('/:currency', getExchangeRates);

module.exports = router;
