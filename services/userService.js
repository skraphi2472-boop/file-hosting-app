import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

export const registerUser = async (email, password, username, firstName, lastName) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, username, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, username, role, created_at',
      [email, hashedPassword, username, firstName, lastName, 'user']
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Email or username already exists');
    }
    throw error;
  }
};

export const getUserById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const getAllUsers = async (limit = 50, offset = 0) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, status, storage_used, warning_count, last_login, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateUserRole = async (userId, role) => {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

export const getUserStats = async (userId) => {
  try {
    const user = await getUserById(userId);
    const filesResult = await pool.query(
      'SELECT COUNT(*) as total_files, COALESCE(SUM(file_size), 0) as total_size, COALESCE(SUM(download_count), 0) as total_downloads FROM files WHERE user_id = $1 AND marked_for_deletion = false',
      [userId]
    );
    
    return {
      user,
      files: filesResult.rows[0]
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

export const updateLastLogin = async (userId) => {
  try {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};
