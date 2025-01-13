require('dotenv').config();
const ExchangeRate = require('../models/ExchangeRate');
const axios = require('axios');
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;

exports.getExchangeRates = async (req, res) => {
  try {
    const { currency } = req.params;
    const response = await axios.get(`${API_URL}/${API_KEY}/latest/${currency}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
