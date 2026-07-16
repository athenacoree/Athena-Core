const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const socialLogin = require('./socialLogin');
const dbService = require('../server/services/keyIdDbService');

const getProfileDetails = ({ profile }) => ({
  email: profile.emails[0].value,
  id: profile.id,
  avatarUrl: profile.photos[0].value,
  username: profile.name.givenName,
  name: `${profile.name.givenName}${profile.name.familyName ? ` ${profile.name.familyName}` : ''}`,
  emailVerified: profile.emails[0].verified,
});

const googleLogin = socialLogin('google', getProfileDetails);
const googleAdminLogin = socialLogin('google', getProfileDetails, { existingUsersOnly: true });

const getGoogleConfig = (callbackURL) => ({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dynamic-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dynamic-client-secret',
  callbackURL,
  proxy: true,
  passReqToCallback: true,
});

class DynamicGoogleStrategy extends GoogleStrategy {
  async authenticate(req, options) {
    try {
      const config = await dbService.getConfig();
      const clientID = config.googleClientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

      if (!clientID || !clientSecret) {
        return this.fail({ message: 'Google OAuth is not configured.' }, 400);
      }

      this._oauth2._clientId = clientID;
      this._oauth2._clientSecret = clientSecret;

      const domainServer = process.env.DOMAIN_SERVER || 'http://localhost:3080';
      const callbackPath = config.googleCallbackUrl || process.env.GOOGLE_CALLBACK_URL || '/oauth/google/callback';
      const callbackURL = callbackPath.startsWith('http') ? callbackPath : `${domainServer}${callbackPath}`;

      this._callbackURL = callbackURL;
      this._oauth2._redirectURI = callbackURL;
    } catch (err) {
      return this.error(err);
    }

    super.authenticate(req, options);
  }
}

class DynamicGoogleAdminStrategy extends GoogleStrategy {
  async authenticate(req, options) {
    try {
      const config = await dbService.getConfig();
      const clientID = config.googleClientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = config.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

      if (!clientID || !clientSecret) {
        return this.fail({ message: 'Google OAuth is not configured.' }, 400);
      }

      this._oauth2._clientId = clientID;
      this._oauth2._clientSecret = clientSecret;

      const domainServer = process.env.DOMAIN_SERVER || 'http://localhost:3080';
      const callbackPath = config.googleCallbackUrl || '/api/admin/oauth/google/callback';
      const callbackURL = callbackPath.startsWith('http') ? callbackPath : `${domainServer}${callbackPath}`;

      this._callbackURL = callbackURL;
      this._oauth2._redirectURI = callbackURL;
    } catch (err) {
      return this.error(err);
    }

    super.authenticate(req, options);
  }
}

const googleStrategy = () =>
  new DynamicGoogleStrategy(
    getGoogleConfig(`${process.env.DOMAIN_SERVER || 'http://localhost:3080'}${process.env.GOOGLE_CALLBACK_URL || '/oauth/google/callback'}`),
    googleLogin,
  );

const googleAdminStrategy = () =>
  new DynamicGoogleAdminStrategy(
    getGoogleConfig(`${process.env.DOMAIN_SERVER || 'http://localhost:3080'}/api/admin/oauth/google/callback`),
    googleAdminLogin,
  );

module.exports = googleStrategy;
module.exports.googleAdminLogin = googleAdminStrategy;
