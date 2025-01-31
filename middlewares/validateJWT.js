const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT.
 */
const validateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado o mal formateado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        const errorType = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
        return res.status(403).json({ error: errorType });
    }
};

module.exports = validateJWT;
