import pool from '../config/database.js';

export const warnUser = async (userId, adminId, reason, severity = 'warning') => {
  try {
    // Create warning record
    await pool.query(
      'INSERT INTO user_warnings (user_id, admin_id, reason, severity) VALUES ($1, $2, $3, $4)',
      [userId, adminId, reason, severity]
    );
    
    // Update warning count
    const warningCount = await pool.query(
      'SELECT COUNT(*) as count FROM user_warnings WHERE user_id = $1',
      [userId]
    );
    
    let userStatus = 'active';
    if (severity === 'suspension') {
      userStatus = 'suspended';
    } else if (severity === 'ban') {
      userStatus = 'banned';
    } else if (warningCount.rows[0].count >= 3) {
      userStatus = 'warned';
    }
    
    await pool.query(
      'UPDATE users SET warning_count = $1, status = $2 WHERE id = $3',
      [warningCount.rows[0].count, userStatus, userId]
    );
    
    return true;
  } catch (error) {
    console.error('Error warning user:', error);
    throw error;
  }
};

export const suspendUser = async (userId, adminId, reason) => {
  return warnUser(userId, adminId, reason, 'suspension');
};

export const banUser = async (userId, adminId, reason) => {
  return warnUser(userId, adminId, reason, 'ban');
};

export const restoreUser = async (userId) => {
  try {
    await pool.query(
      'UPDATE users SET status = $1, warning_count = 0 WHERE id = $2',
      ['active', userId]
    );
    return true;
  } catch (error) {
    console.error('Error restoring user:', error);
    throw error;
  }
};

export const getWarnings = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_warnings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching warnings:', error);
    throw error;
  }
};

export const createAuditLog = async (adminId, action, targetType, targetId, details, ipAddress) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [adminId, action, targetType, targetId, details, ipAddress]
    );
    return true;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

export const getAuditLogs = async (limit = 100, offset = 0) => {
  try {
    const result = await pool.query(
      'SELECT a.*, u.email as admin_email FROM audit_logs a LEFT JOIN users u ON a.admin_id = u.id ORDER BY a.created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};
