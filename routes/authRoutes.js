const express = require('express');
const { generateJWT } = require('../utils/generateJWT');
const router = express.Router();

// Endpoint para obtener un token
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validación simple (puedes reemplazar esto con lógica real de autenticación)
    if (username === 'admin' && password === 'password') {
        const token = generateJWT({ username });
        return res.json({ token });
    }

    return res.status(401).json({ error: 'Credenciales incorrectas.' });
});

module.exports = router;
