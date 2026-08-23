import pool from '../config/database.js';

export const createReport = async (fileId, reporterEmail, reason, description) => {
  try {
    const result = await pool.query(
      'INSERT INTO reports (file_id, reporter_email, reason, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [fileId, reporterEmail, reason, description]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

export const getPendingReports = async () => {
  try {
    const result = await pool.query(
      'SELECT r.*, f.original_name, f.user_id, u.email as user_email FROM reports r JOIN files f ON r.file_id = f.id JOIN users u ON f.user_id = u.id WHERE r.status = $1 ORDER BY r.created_at DESC',
      ['pending']
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    throw error;
  }
};

export const updateReportStatus = async (reportId, status, adminId, adminNotes) => {
  try {
    const result = await pool.query(
      'UPDATE reports SET status = $1, resolved_by = $2, admin_notes = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [status, adminId, adminNotes, reportId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};
