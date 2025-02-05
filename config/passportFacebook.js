const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('@models/User');

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
                email: profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`,
                provider: 'facebook',
                providerId: profile.id,
            });
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

module.exports = passport;
