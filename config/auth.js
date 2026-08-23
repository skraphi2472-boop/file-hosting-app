import passport from 'passport';
import LocalStrategy from 'passport-local';
import GoogleStrategy from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import pool from './database.js';
import dotenv from 'dotenv';

dotenv.config();

// Local Strategy
passport.use(new LocalStrategy.Strategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return done(null, false, { message: 'User not found' });
      }
      
      const user = result.rows[0];
      
      if (!user.password_hash) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      
      // Check user status
      if (user.status !== 'active') {
        return done(null, false, { message: `Account is ${user.status}` });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy.Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      );
      
      if (user.rows.length > 0) {
        return done(null, user.rows[0]);
      }
      
      // Create new user
      const email = profile.emails[0]?.value || `${profile.id}@google.com`;
      const firstName = profile.name.givenName || '';
      const lastName = profile.name.familyName || '';
      const username = profile.displayName || email.split('@')[0];
      const avatar = profile.photos[0]?.value || null;
      
      const result = await pool.query(
        'INSERT INTO users (username, email, first_name, last_name, google_id, avatar_url, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [username, email, firstName, lastName, profile.id, avatar, 'user']
      );
      
      return done(null, result.rows[0]);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (error) {
    done(error);
  }
});

export default passport;
