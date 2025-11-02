const auth = require('../auth');

const hasRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      
      if (!session || !session.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = session.user.role;

      if (!userRole || userRole !== requiredRole) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      req.user = session.user;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
  };
};

module.exports = hasRole;