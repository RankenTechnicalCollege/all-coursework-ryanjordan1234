// middleware/auth.js
// Create this file in a 'middleware' folder at your project root

import debug from 'debug';

const debugAuth = debug('app:middleware:auth');

/**
 * Middleware to check if user is authenticated
 * Checks for user data in session and makes it available via req.user
 */
export const requireAuth = (req, res, next) => {
  debugAuth('Checking authentication...');
  
  // Check if session exists and has user data
  if (!req.session || !req.session.user) {
    debugAuth('Authentication failed - no session or user data');
    return res.status(401).json({ 
      error: 'Unauthorized. Please log in.' 
    });
  }
  
  // Make user data easily accessible throughout the request
  req.user = req.session.user;
  
  debugAuth(`User authenticated: ${req.user.email}`);
  next(); // Continue to the next middleware or route handler
};

/**
 * Optional: Middleware to check if user has specific role(s)
 * Use this after requireAuth for role-based access control
 * 
 * Example usage:
 * router.delete('/users/:id', requireAuth, requireRole(['Technical Manager']), deleteUser);
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    debugAuth(`Checking role authorization for: ${req.user.email}`);
    
    if (!req.user || !req.user.role) {
      debugAuth('Authorization failed - no user role found');
      return res.status(403).json({ 
        error: 'Forbidden. User role not found.' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      debugAuth(`Authorization failed - user role ${req.user.role} not in allowed roles`);
      return res.status(403).json({ 
        error: `Forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    debugAuth(`User authorized with role: ${req.user.role}`);
    next();
  };
};

/**
 * Optional: Middleware to allow users to access their own resources
 * or admins to access any resource
 */
export const requireOwnerOrAdmin = (req, res, next) => {
  debugAuth('Checking ownership or admin privileges...');
  
  const requestedUserId = req.params.userId;
  const currentUserId = req.user.userId;
  const isAdmin = ['Technical Manager', 'Product Manager'].includes(req.user.role);
  
  if (requestedUserId === currentUserId || isAdmin) {
    debugAuth('Access granted - user is owner or admin');
    next();
  } else {
    debugAuth('Access denied - user is not owner or admin');
    return res.status(403).json({ 
      error: 'Forbidden. You can only access your own resources.' 
    });
  }
};