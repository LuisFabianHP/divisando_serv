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
        if (err.name === 'JsonWebTokenError') {
            console.error('JWT inválido:', err.message);
            return res.status(403).json({ error: 'Token inválido.' });
        }
        if (err.name === 'TokenExpiredError') {
            console.error('JWT expirado:', err.message);
            return res.status(403).json({ error: 'Token expirado.' });
        }
        console.error('Error en la validación del JWT:', err);
        return res.status(403).json({ error: 'Algo salió mal. Por favor, intenta nuevamente.' });
    }
    
};

module.exports = validateJWT;
