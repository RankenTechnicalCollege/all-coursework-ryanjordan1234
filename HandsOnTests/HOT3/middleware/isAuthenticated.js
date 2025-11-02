const auth = require('../auth');

const isAuthenticated = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    req.user = session.user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = isAuthenticated;