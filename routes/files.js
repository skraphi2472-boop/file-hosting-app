import express from 'express';
import { isAuthenticated, checkUserStatus, isAdmin } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import multer from 'multer';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../services/s3Service.js';
import * as fileService from '../services/fileService.js';
import { sanitizeFileName } from '../middleware/validation.js';
import dotenv from 'dotenv';
import mime from 'mime-types';

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5368709120;
const ALLOWED_TYPES = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,application/pdf').split(',');

// Upload file
router.post('/upload', isAuthenticated, checkUserStatus, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File size exceeds maximum limit' });
    }
    
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }
    
    const s3Key = await uploadToS3(req.file, req.user.id);
    const fileName = sanitizeFileName(req.file.originalname);
    
    const { expiration, expirationDate, isPublic } = req.body;
    let expiresAt = null;
    
    if (expiration === '1h') expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    else if (expiration === '1d') expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    else if (expiration === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (expiration === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else if (expiration === 'custom' && expirationDate) expiresAt = new Date(expirationDate);
    
    const file = await fileService.uploadFile(
      req.user.id,
      fileName,
      fileName,
      req.file.size,
      req.file.mimetype,
      s3Key,
      isPublic === 'true'
    );
    
    if (expiresAt) {
      await fileService.setFileExpiration(file.id, req.user.id, expiresAt);
    }
    
    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's files
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const files = await fileService.getFilesByUserId(req.user.id);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download file
router.get('/:fileId/download', isAuthenticated, checkUserStatus, async (req, res) => {
  try {
    const file = await fileService.getPublicFile(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if user owns the file or it's public
    if (file.user_id !== req.user.id && !file.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const signedUrl = await getSignedUrl(file.s3_key);
    await fileService.updateFileDownloadCount(file.id);
    
    res.json({ url: signedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename file
router.put('/:fileId', isAuthenticated, checkUserStatus, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'New name is required' });
    }
    
    const file = await fileService.renameFile(req.params.fileId, req.user.id, newName);
    res.json({ message: 'File renamed successfully', file });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete file
router.delete('/:fileId', isAuthenticated, checkUserStatus, async (req, res) => {
  try {
    const files = await fileService.getFilesByUserId(req.user.id);
    const fileToDelete = files.find(f => f.id == req.params.fileId);
    
    if (!fileToDelete) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await deleteFromS3(fileToDelete.s3_key);
    await fileService.deleteFile(req.params.fileId, req.user.id);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle file public
router.put('/:fileId/public', isAuthenticated, checkUserStatus, async (req, res) => {
  try {
    const { isPublic } = req.body;
    const file = await fileService.toggleFilePublic(req.params.fileId, req.user.id, isPublic === true);
    res.json({ message: 'File visibility updated', file });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Set file expiration
router.put('/:fileId/expiration', isAuthenticated, checkUserStatus, async (req, res) => {
  try {
    const { expiration, expirationDate } = req.body;
    let expiresAt = null;
    
    if (expiration === '1h') expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    else if (expiration === '1d') expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    else if (expiration === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (expiration === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else if (expiration === 'custom' && expirationDate) expiresAt = new Date(expirationDate);
    else if (expiration === 'never') expiresAt = null;
    
    const file = await fileService.setFileExpiration(req.params.fileId, req.user.id, expiresAt);
    res.json({ message: 'File expiration updated', file });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
