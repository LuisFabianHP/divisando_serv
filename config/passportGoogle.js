const passport = require('passport'); 
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('@models/User');
const { generateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
}, async (a, b, profile, done) => { // Eliminamos accessToken
    try {
        let user = await User.findOne({ providerId: profile.id, provider: 'google' });

        if (!user) {
            // Si el usuario no existe, lo creamos con un Refresh Token generado
            user = await User.create({
                username: profile.displayName,
                email: profile.emails?.[0]?.value || null, // Evita errores si no hay email,
                provider: 'google',
                providerId: profile.id,
                refreshToken: generateRefreshToken(profile.id), 
            });
        } else {
            // Si el usuario ya existe, actualizamos su Refresh Token
            user.refreshToken = generateRefreshToken(user.id);
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        apiLogger.error(`[passportGoogle]: ${error.message}`, { stack: error.stack });
        return done(error, null);
    }
}));

module.exports = passport;
