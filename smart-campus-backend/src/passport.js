import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './db.js';

/**
 * configurePassport(passport)
 *
 * Sets up the Google OAuth 2.0 strategy.
 * On successful login we upsert the user by their Google ID so a user
 * who changes their email still maps to the same record.
 *
 * Serialise/deserialise are only used during the OAuth redirect dance
 * (the session is killed after we issue our own JWTs).
 */
export function configurePassport(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `http://localhost:${process.env.PORT || 8787}/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || email?.split('@')[0] || 'Student';

          // Upsert: find by googleId first, fall back to email for existing accounts
          let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

          if (!user && email) {
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              // Link Google ID to an existing email/password account
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            }
          }

          if (!user) {
            // Brand-new user — create one
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email: email || `${profile.id}@google.oauth`,
                name,
                role: 'student', // Google OAuth users are always students
                // password is null for OAuth-only accounts
              },
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Minimal serialise — only used for the brief OAuth redirect session
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}
