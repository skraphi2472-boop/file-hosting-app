export const validateFileName = (req, res, next) => {
  const { file_name } = req.body;
  if (!file_name || file_name.trim().length === 0) {
    return res.status(400).json({ error: 'File name is required' });
  }
  next();
};

export const validateFileExpiration = (req, res, next) => {
  const { expiration } = req.body;
  const validExpiration = ['1h', '1d', '7d', '30d', 'never', 'custom'];
  
  if (expiration && !validExpiration.includes(expiration)) {
    return res.status(400).json({ error: 'Invalid expiration option' });
  }
  next();
};

export const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
};
