export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
};

export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
};

export const isAdminOrModerator = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    return next();
  }
  return res.status(403).json({ error: 'Admin or Moderator access required' });
};

export const checkUserStatus = (req, res, next) => {
  if (req.user && req.user.status !== 'active') {
    return res.status(403).json({ error: `Your account is ${req.user.status}` });
  }
  next();
};
