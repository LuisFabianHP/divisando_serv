const express = require('express');
const axios = require('axios');
const router = express.Router(); // Usamos un router en lugar de `app`

router.get('/get-ip', async (req, res) => {
  try {
    const respuesta = await axios.get('https://api.ipify.org?format=json');
    //`La IP pública del servidor es: ${respuesta.data.ip}`
    res.json({ ip: respuesta.data.ip });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener la IP pública.' });
  }
});

module.exports = router;