const express = require('express');
const router = express.Router();
const { 
    verificationCodeLimiter,
    forgotPasswordLimiter,
    resendCodeLimiter
} = require('@middlewares/verificationRateLimiter');
const { 
    login,
    loginWithGoogle,
    loginWithApple,
    register, 
    refreshAccessToken, 
    logout,
    verificationCode, 
    resendVerificationCode,
    forgotPassword,
    resetPassword,
    cancelAccount,
    getProfile,
    updateProfile
} = require('@controllers/authController');
const validateJWT = require('@middlewares/validateJWT');

const logProfileRouteHit = (req, _res, next) => {
    const traceId = req.headers['x-trace-id'] || '-';
    console.log(`[PROFILE_ROUTE_HIT] method=${req.method} path=${req.originalUrl} traceId=${traceId}`);
    next();
};

// Rutas principales de autenticación
router.post('/register', register);
router.post('/login', login);
router.post('/google', loginWithGoogle); // Endpoint para mobile/Flutter (Google)
router.post('/apple', loginWithApple); // Endpoint para mobile/Flutter (Apple)
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/code/verification', verificationCodeLimiter, verificationCode);
router.post('/code/resend', resendCodeLimiter, resendVerificationCode);
router.post('/password/forgot', forgotPasswordLimiter, forgotPassword);
router.post('/password/reset', resetPassword);
router.get('/profile', logProfileRouteHit, validateJWT, getProfile);
router.put('/profile', logProfileRouteHit, validateJWT, updateProfile);
// Cancelación de cuenta (soft delete)
router.delete('/account', validateJWT, cancelAccount);

module.exports = router;
