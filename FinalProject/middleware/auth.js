// middleware/auth.js
import debug from 'debug';
import * as db from '../database.js';

const debugAuth = debug('app:middleware:auth');

export const isAuthenticated = (req, res, next) => {
  debugAuth('Checking authentication...');
  
  if (!req.session || !req.session.user) {
    debugAuth('Authentication failed - no session');
    return res.status(401).json({ 
      error: 'Unauthorized. Please log in.' 
    });
  }
  
  req.user = req.session.user;
  debugAuth(`User authenticated: ${req.user.email}`);
  next();
};


export const hasAnyRole = (req, res, next) => {
  debugAuth('Checking if user has any role...');
  
  if (!req.user || !req.user.role) {
    debugAuth('Authorization failed - no role assigned');
    return res.status(403).json({ 
      error: 'Forbidden. You must have a role assigned to perform this action.' 
    });
  }
  
  debugAuth(`User has role: ${req.user.role}`);
  next();
};

/**
 * Middleware: hasRole
 * Checks if user has one of the specified roles
 * @param {Array<string>} allowedRoles - Array of allowed role names
 */
export const hasRole = (allowedRoles) => {
  return async (req, res, next) => {
    debugAuth(`Checking if user has one of these roles: ${allowedRoles.join(', ')}`);
    
    if (!req.user || !req.user.role) {
      debugAuth('Authorization failed - no role found');
      return res.status(403).json({ 
        error: 'Forbidden. User role not found.' 
      });
    }
    
    // Fetch user's full role data from database to get permissions
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      return res.status(403).json({ error: 'User not found.' });
    }
    
    // Support both single role string and array of roles
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    
    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));
    
    if (!hasRequiredRole) {
      debugAuth(`Authorization failed - user roles [${userRoles.join(', ')}] not in allowed roles`);
      return res.status(403).json({ 
        error: `Forbidden. This action requires one of these roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    debugAuth(`User authorized with roles: ${userRoles.join(', ')}`);
    next();
  };
};

/**
 * Middleware: hasPermission
 * Checks if user has a specific permission based on their role
 * @param {string} permission - Permission name (e.g., 'canEditAnyUser')
 */
export const hasPermission = (permission) => {
  return async (req, res, next) => {
    debugAuth(`Checking permission: ${permission}`);
    
    if (!req.user || !req.user.userId) {
      debugAuth('Permission check failed - no user');
      return res.status(403).json({ 
        error: 'Forbidden. User not authenticated.' 
      });
    }
    
    try {
      // Fetch user's full data including roles
      const user = await db.findUserById(req.user.userId);
      if (!user || !user.role) {
        debugAuth('Permission check failed - user or role not found');
        return res.status(403).json({ 
          error: 'Forbidden. User role not found.' 
        });
      }
      
      // Get role documents from database
      const db_instance = await db.getDb();
      
      // Support both single role string and array of roles
      const userRoles = Array.isArray(user.role) ? user.role : [user.role];
      
      // Fetch all role documents for the user's roles
      const roleDocuments = await db_instance.collection('role')
        .find({ name: { $in: userRoles } })
        .toArray();
      
      if (!roleDocuments || roleDocuments.length === 0) {
        debugAuth('Permission check failed - role documents not found');
        return res.status(403).json({ 
          error: 'Forbidden. Role configuration not found.' 
        });
      }
      
      // Check if any of the user's roles has the required permission
      const hasPermission = roleDocuments.some(roleDoc => 
        roleDoc.permissions && roleDoc.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        debugAuth(`Permission denied - user lacks ${permission}`);
        return res.status(403).json({ 
          error: `Forbidden. You do not have permission: ${permission}` 
        });
      }
      
      debugAuth(`Permission granted: ${permission}`);
      
      // Attach role documents to request for potential use in route handlers
      req.userRoles = roleDocuments;
      
      next();
    } catch (error) {
      debugAuth('Error checking permission:', error);
      return res.status(500).json({ 
        error: 'Internal server error during permission check.' 
      });
    }
  };
};


export const canEditBug = async (req, res, next) => {
  debugAuth('Checking if user can edit this bug...');
  
  try {
    const bugId = req.params.bugId;
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Get user's permissions
    const user = await db.findUserById(req.user.userId);
    const db_instance = await db.getDb();
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const roleDocuments = await db_instance.collection('role')
      .find({ name: { $in: userRoles } })
      .toArray();
    
    const permissions = roleDocuments.flatMap(role => role.permissions || []);
    
    // Check permissions in order of precedence
    if (permissions.includes('canEditAnyBug')) {
      debugAuth('User can edit any bug');
      return next();
    }
    
    if (permissions.includes('canEditMyBug') && bug.author === req.user.email) {
      debugAuth('User can edit their own bug');
      return next();
    }
    
    if (permissions.includes('canEditIfAssignedTo') && bug.assignedTo === req.user.email) {
      debugAuth('User can edit bug assigned to them');
      return next();
    }
    
    debugAuth('User cannot edit this bug');
    return res.status(403).json({ 
      error: 'Forbidden. You do not have permission to edit this bug.' 
    });
    
  } catch (error) {
    debugAuth('Error checking bug edit permission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper middleware: Check if user can reassign a specific bug
 */
export const canReassignBug = async (req, res, next) => {
  debugAuth('Checking if user can reassign this bug...');
  
  try {
    const bugId = req.params.bugId;
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Get user's permissions
    const user = await db.findUserById(req.user.userId);
    const db_instance = await db.getDb();
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const roleDocuments = await db_instance.collection('role')
      .find({ name: { $in: userRoles } })
      .toArray();
    
    const permissions = roleDocuments.flatMap(role => role.permissions || []);
    
    // Check permissions
    if (permissions.includes('canReassignAnyBug')) {
      debugAuth('User can reassign any bug');
      return next();
    }
    
    if (permissions.includes('canReassignIfAssignedTo') && bug.assignedTo === req.user.email) {
      debugAuth('User can reassign bug assigned to them');
      return next();
    }
    
    if (permissions.includes('canEditMyBug') && bug.author === req.user.email) {
      debugAuth('User can reassign their own bug');
      return next();
    }
    
    debugAuth('User cannot reassign this bug');
    return res.status(403).json({ 
      error: 'Forbidden. You do not have permission to reassign this bug.' 
    });
    
  } catch (error) {
    debugAuth('Error checking bug reassign permission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper middleware: Check if user can classify a specific bug
 */
export const canClassifyBug = async (req, res, next) => {
  debugAuth('Checking if user can classify this bug...');
  
  try {
    const bugId = req.params.bugId;
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Get user's permissions
    const user = await db.findUserById(req.user.userId);
    const db_instance = await db.getDb();
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const roleDocuments = await db_instance.collection('role')
      .find({ name: { $in: userRoles } })
      .toArray();
    
    const permissions = roleDocuments.flatMap(role => role.permissions || []);
    
    // Check permissions
    if (permissions.includes('canClassifyAnyBug')) {
      debugAuth('User can classify any bug');
      return next();
    }
    
    if (permissions.includes('canEditIfAssignedTo') && bug.assignedTo === req.user.email) {
      debugAuth('User can classify bug assigned to them');
      return next();
    }
    
    if (permissions.includes('canEditMyBug') && bug.author === req.user.email) {
      debugAuth('User can classify their own bug');
      return next();
    }
    
    debugAuth('User cannot classify this bug');
    return res.status(403).json({ 
      error: 'Forbidden. You do not have permission to classify this bug.' 
    });
    
  } catch (error) {
    debugAuth('Error checking bug classify permission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};