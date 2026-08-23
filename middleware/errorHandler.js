export const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  if (err.message === 'File too large') {
    return res.status(413).json({ error: 'File size exceeds maximum limit' });
  }
  
  if (err.message === 'Invalid MIME type') {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};
