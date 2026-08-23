import express from 'express';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import authConfig from './config/auth.js';
import pool from './config/database.js';
import * as fileService from './services/fileService.js';
import { deleteFromS3 } from './services/s3Service.js';
import cron from 'node-cron';

import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
app.use(generalLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/public', publicRoutes);
app.use('/admin-panel/api', adminRoutes);

// Admin panel redirect (must be after all API routes)
app.get('/admin-panel', (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    res.sendFile(new URL('./views/admin/index.html', import.meta.url).pathname);
  } else {
    res.redirect('/');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Cleanup task for expired files
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_HOURS) || 24;

cron.schedule(`0 */${CLEANUP_INTERVAL} * * *`, async () => {
  try {
    console.log('Running cleanup task for expired files...');
    const filesToDelete = await fileService.getFilesMarkedForDeletion();
    
    for (const file of filesToDelete) {
      try {
        await deleteFromS3(file.s3_key);
        await pool.query('DELETE FROM files WHERE id = $1', [file.id]);
        console.log(`Deleted expired file: ${file.id}`);
      } catch (error) {
        console.error(`Error deleting file ${file.id}:`, error);
      }
    }
    
    // Mark expired files for deletion if not already marked
    const expiredFiles = await fileService.getExpiredFiles();
    for (const file of expiredFiles) {
      try {
        await fileService.markFileForDeletion(file.id);
      } catch (error) {
        console.error(`Error marking file ${file.id} for deletion:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanup task:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
