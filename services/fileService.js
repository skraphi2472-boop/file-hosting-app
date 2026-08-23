import pool from '../config/database.js';

export const uploadFile = async (userId, fileName, originalName, fileSize, mimeType, s3Key, isPublic = false) => {
  try {
    const result = await pool.query(
      'INSERT INTO files (user_id, file_name, original_name, file_size, mime_type, s3_key, is_public, public_link_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [userId, fileName, originalName, fileSize, mimeType, s3Key, isPublic, isPublic ? generateToken() : null]
    );
    
    // Update user storage
    await pool.query('UPDATE users SET storage_used = storage_used + $1 WHERE id = $2', [fileSize, userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const getFilesByUserId = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE user_id = $1 AND marked_for_deletion = false ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

export const getPublicFile = async (token) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE public_link_token = $1 AND is_public = true AND (expires_at IS NULL OR expires_at > NOW())',
      [token]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching public file:', error);
    throw error;
  }
};

export const updateFileDownloadCount = async (fileId) => {
  try {
    await pool.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [fileId]
    );
  } catch (error) {
    console.error('Error updating download count:', error);
    throw error;
  }
};

export const deleteFile = async (fileId, userId) => {
  try {
    const file = await pool.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);
    
    if (file.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }
    
    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
    
    // Update user storage
    await pool.query('UPDATE users SET storage_used = storage_used - $1 WHERE id = $2', [file.rows[0].file_size, userId]);
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const renameFile = async (fileId, userId, newName) => {
  try {
    const result = await pool.query(
      'UPDATE files SET original_name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [newName, fileId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error renaming file:', error);
    throw error;
  }
};

export const setFileExpiration = async (fileId, userId, expiresAt) => {
  try {
    const result = await pool.query(
      'UPDATE files SET expires_at = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [expiresAt, fileId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error setting file expiration:', error);
    throw error;
  }
};

export const toggleFilePublic = async (fileId, userId, isPublic) => {
  try {
    const token = isPublic ? generateToken() : null;
    const result = await pool.query(
      'UPDATE files SET is_public = $1, public_link_token = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [isPublic, token, fileId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error toggling file public status:', error);
    throw error;
  }
};

export const getExpiredFiles = async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE expires_at < NOW() AND is_expired = false'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching expired files:', error);
    throw error;
  }
};

export const markFileForDeletion = async (fileId) => {
  try {
    await pool.query(
      'UPDATE files SET is_expired = true, marked_for_deletion = true, deletion_scheduled_at = NOW() + INTERVAL \'7 days\' WHERE id = $1',
      [fileId]
    );
    return true;
  } catch (error) {
    console.error('Error marking file for deletion:', error);
    throw error;
  }
};

export const getFilesMarkedForDeletion = async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE marked_for_deletion = true AND deletion_scheduled_at <= NOW()'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching files marked for deletion:', error);
    throw error;
  }
};

function generateToken() {
  return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}
