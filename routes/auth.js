import express from 'express';
import { isAuthenticated, checkUserStatus } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import passport from 'passport';
import { registerUser, updateLastLogin } from '../services/userService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, username, firstName, lastName } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const user = await registerUser(email, password, username, firstName || '', lastName || '');
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', authLimiter, passport.authenticate('local'), (req, res) => {
  updateLastLogin(req.user.id);
  res.json({ message: 'Login successful', user: req.user });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  updateLastLogin(req.user.id);
  res.redirect('/');
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

// Check auth status
router.get('/status', (req, res) => {
  res.json({ authenticated: req.isAuthenticated(), user: req.user || null });
});

export default router;
