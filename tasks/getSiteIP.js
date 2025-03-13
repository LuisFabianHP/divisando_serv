const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.get('/mi-ip', async (req, res) => {
  try {
    const respuesta = await axios.get('https://api.ipify.org?format=json');
    res.send(`La IP pública del servidor es: ${respuesta.data.ip}`);
  } catch (error) {
    res.status(500).send('No se pudo obtener la IP pública.');
  }
});

app.listen(port, () => {
  console.log(`Servidor en ejecución en el puerto ${port}`);
});
