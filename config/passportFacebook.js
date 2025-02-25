const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('@models/User');
const { generateRefreshToken } = require('@utils/refreshToken');
const { apiLogger } = require('@utils/logger');

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID, 
    clientSecret: process.env.FACEBOOK_APP_SECRET, 
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ providerId: profile.id, provider: 'facebook' });

        if (!user) {
            user = await User.create({
                username: profile.displayName,
                email: profile.emails ? profile.emails[0].value : null,
                provider: 'facebook',
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
        apiLogger.error(`[passportFacebook]: ${error.message}`, { stack: error.stack });
        return done(error, null);
    }
}));

module.exports = passport;
