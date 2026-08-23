import express from 'express';
import * as fileService from '../services/fileService.js';
import * as reportService from '../services/reportService.js';
import { getSignedUrl } from '../services/s3Service.js';
import { updateFileDownloadCount } from '../services/fileService.js';

const router = express.Router();

// Get public file
router.get('/:token', async (req, res) => {
  try {
    const file = await fileService.getPublicFile(req.params.token);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    res.json({
      id: file.id,
      name: file.original_name,
      size: file.file_size,
      type: file.mime_type,
      uploadDate: file.created_at,
      downloadCount: file.download_count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download public file
router.get('/:token/download', async (req, res) => {
  try {
    const file = await fileService.getPublicFile(req.params.token);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    const signedUrl = await getSignedUrl(file.s3_key);
    await updateFileDownloadCount(file.id);
    
    res.json({ url: signedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report file
router.post('/:token/report', async (req, res) => {
  try {
    const { reporterEmail, reason, description } = req.body;
    const file = await fileService.getPublicFile(req.params.token);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (!['malware', 'phishing', 'copyright', 'illegal', 'spam', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }
    
    const report = await reportService.createReport(file.id, reporterEmail, reason, description);
    res.status(201).json({ message: 'Report submitted successfully', reportId: report.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
