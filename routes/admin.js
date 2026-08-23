import express from 'express';
import { isAdmin, isAdminOrModerator } from '../middleware/auth.js';
import * as adminService from '../services/adminService.js';
import * as userService from '../services/userService.js';
import * as fileService from '../services/fileService.js';
import * as reportService from '../services/reportService.js';
import { deleteFromS3 } from '../services/s3Service.js';
import pool from '../config/database.js';

const router = express.Router();

// Admin Dashboard - Statistics
router.get('/dashboard/stats', isAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const filesResult = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(file_size), 0) as total_size FROM files WHERE marked_for_deletion = false');
    const reportsResult = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status = $1 THEN 1 END) as pending FROM reports', ['pending']);
    
    res.json({
      totalUsers: usersResult.rows[0].total,
      totalFiles: filesResult.rows[0].total,
      totalStorage: filesResult.rows[0].total_size,
      totalReports: reportsResult.rows[0].total,
      pendingReports: reportsResult.rows[0].pending
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Management - List all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    
    const users = await userService.getAllUsers(limit, offset);
    res.json({ users, page, limit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details
router.get('/users/:userId', isAdmin, async (req, res) => {
  try {
    const stats = await userService.getUserStats(req.params.userId);
    const warnings = await adminService.getWarnings(req.params.userId);
    const files = await fileService.getFilesByUserId(req.params.userId);
    
    res.json({ ...stats, warnings, files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.put('/users/:userId/role', isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await userService.updateUserRole(req.params.userId, role);
    await adminService.createAuditLog(req.user.id, 'UPDATE_USER_ROLE', 'user', req.params.userId, `Role changed to ${role}`, req.ip);
    
    res.json({ message: 'User role updated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Warn user
router.post('/users/:userId/warn', isAdmin, async (req, res) => {
  try {
    const { reason, severity } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    await adminService.warnUser(req.params.userId, req.user.id, reason, severity || 'warning');
    await adminService.createAuditLog(req.user.id, 'WARN_USER', 'user', req.params.userId, `Warned: ${reason}`, req.ip);
    
    res.json({ message: 'User warned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend user
router.post('/users/:userId/suspend', isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    await adminService.suspendUser(req.params.userId, req.user.id, reason || 'Suspended by admin');
    await adminService.createAuditLog(req.user.id, 'SUSPEND_USER', 'user', req.params.userId, reason || 'Suspended', req.ip);
    
    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban user
router.post('/users/:userId/ban', isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    await adminService.banUser(req.params.userId, req.user.id, reason || 'Banned by admin');
    await adminService.createAuditLog(req.user.id, 'BAN_USER', 'user', req.params.userId, reason || 'Banned', req.ip);
    
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore user
router.post('/users/:userId/restore', isAdmin, async (req, res) => {
  try {
    await adminService.restoreUser(req.params.userId);
    await adminService.createAuditLog(req.user.id, 'RESTORE_USER', 'user', req.params.userId, 'User restored', req.ip);
    
    res.json({ message: 'User restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File Management - Get all files
router.get('/files', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT f.*, u.email as user_email FROM files f JOIN users u ON f.user_id = u.id WHERE f.marked_for_deletion = false ORDER BY f.created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    res.json({ files: result.rows, page, limit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file by admin
router.delete('/files/:fileId', isAdmin, async (req, res) => {
  try {
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.fileId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    await deleteFromS3(file.s3_key);
    await pool.query('DELETE FROM files WHERE id = $1', [req.params.fileId]);
    await adminService.createAuditLog(req.user.id, 'DELETE_FILE', 'file', req.params.fileId, file.original_name, req.ip);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disable public link
router.put('/files/:fileId/disable-public', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE files SET is_public = false, public_link_token = null WHERE id = $1 RETURNING *',
      [req.params.fileId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await adminService.createAuditLog(req.user.id, 'DISABLE_PUBLIC_LINK', 'file', req.params.fileId, 'Public link disabled', req.ip);
    res.json({ message: 'Public link disabled', file: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reports - Get pending reports
router.get('/reports', isAdminOrModerator, async (req, res) => {
  try {
    const reports = await reportService.getPendingReports();
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update report status
router.put('/reports/:reportId', isAdminOrModerator, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const report = await reportService.updateReportStatus(req.params.reportId, status, req.user.id, adminNotes);
    await adminService.createAuditLog(req.user.id, 'UPDATE_REPORT', 'report', req.params.reportId, `Status: ${status}`, req.ip);
    
    res.json({ message: 'Report updated', report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expired files - Get files in retention
router.get('/expired-files', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT f.*, u.email as user_email FROM files f JOIN users u ON f.user_id = u.id WHERE f.marked_for_deletion = true ORDER BY f.deletion_scheduled_at DESC'
    );
    res.json({ files: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit logs
router.get('/audit-logs', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;
    
    const logs = await adminService.getAuditLogs(limit, offset);
    res.json({ logs, page, limit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System settings
router.get('/settings', isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings');
    res.json({ settings: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings/:key', isAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const result = await pool.query(
      'UPDATE system_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = $2 RETURNING *',
      [value, req.params.key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    await adminService.createAuditLog(req.user.id, 'UPDATE_SETTING', 'setting', null, `${req.params.key} = ${value}`, req.ip);
    res.json({ message: 'Setting updated', setting: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
