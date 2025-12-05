import { auth } from '../lib/auth.js';
import { findUserById } from '../database.js';  // ← CORRECT: findUserById (not getUserById)
import debug from 'debug';

const debugAuth = debug('app:auth');

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      debugAuth('Authentication failed - no session');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in.' 
      });
    }
    
    const user = await findUserById(session.user.id);  // ← CORRECT: findUserById
    
    if (!user) {
      debugAuth('Authentication failed - user not found');
      return res.status(401).json({ 
        message: 'User not found.' 
      });
    }
    
    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      givenName: user.givenName,
      familyName: user.familyName,
      role: user.role
    };
    
    req.session = session;
    
    debugAuth(`User authenticated: ${user.email}`);
    next();
  } catch (err) {
    debugAuth(`Authentication error: ${err}`);
    return res.status(401).json({ 
      message: 'Invalid or expired session.' 
    });
  }
};

/**
 * Get role permissions from database
 */
async function getRolePermissions(role) {
  if (!role) return [];
  
  try {
    const { getDb } = await import('../database.js');
    const db = await getDb();
    const roles = Array.isArray(role) ? role : [role];
    
    const roleDocuments = await db.collection('role')
      .find({ name: { $in: roles } })
      .toArray();
    
    const permissions = new Set();
    roleDocuments.forEach(roleDoc => {
      if (roleDoc.permissions && Array.isArray(roleDoc.permissions)) {
        roleDoc.permissions.forEach(perm => permissions.add(perm));
      }
    });
    
    return Array.from(permissions);
  } catch (err) {
    debugAuth(`Error fetching role permissions: ${err}`);
    return [];
  }
}

/**
 * Middleware factory to check specific permissions
 */
export function hasPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Authentication required.' 
        });
      }
      
      const permissions = await getRolePermissions(req.user.role);
      
      if (!permissions.includes(requiredPermission)) {
        debugAuth(`Permission denied for ${req.user.email}: requires ${requiredPermission}`);
        return res.status(403).json({ 
          message: 'Forbidden. You do not have permission to perform this action.' 
        });
      }
      
      debugAuth(`Permission granted for ${req.user.email}: ${requiredPermission}`);
      next();
    } catch (err) {
      debugAuth(`Permission check error: ${err}`);
      return res.status(500).json({ 
        message: 'Error checking permissions.' 
      });
    }
  };
}

/**
 * Check if user can edit a specific bug
 */
export async function canEditBug(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }
    
    const { bugId } = req.params;
    const { findBugById } = await import('../database.js');  // ← CORRECT: findBugById
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ 
        message: `Bug ${bugId} not found.` 
      });
    }
    
    const permissions = await getRolePermissions(req.user.role);
    
    // Can edit if: has canEditAnyBug, OR is author with canEditMyBug, OR is assigned with canEditIfAssignedTo
    if (permissions.includes('canEditAnyBug')) {
      return next();
    }
    
    if (permissions.includes('canEditMyBug') && bug.author === req.user.email) {
      return next();
    }
    
    if (permissions.includes('canEditIfAssignedTo') && bug.assignedTo === req.user.email) {
      return next();
    }
    
    debugAuth(`Edit denied for ${req.user.email} on bug ${bugId}`);
    return res.status(403).json({ 
      message: 'Forbidden. You do not have permission to edit this bug.' 
    });
  } catch (err) {
    debugAuth(`canEditBug error: ${err}`);
    return res.status(500).json({ 
      message: 'Error checking permissions.' 
    });
  }
}

/**
 * Check if user can reassign a bug
 */
export async function canReassignBug(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }
    
    const { bugId } = req.params;
    const { findBugById } = await import('../database.js');  // ← CORRECT: findBugById
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ 
        message: `Bug ${bugId} not found.` 
      });
    }
    
    const permissions = await getRolePermissions(req.user.role);
    
    if (permissions.includes('canReassignAnyBug')) {
      return next();
    }
    
    if (permissions.includes('canReassignMyBug') && bug.author === req.user.email) {
      return next();
    }
    
    debugAuth(`Reassign denied for ${req.user.email} on bug ${bugId}`);
    return res.status(403).json({ 
      message: 'Forbidden. You do not have permission to reassign this bug.' 
    });
  } catch (err) {
    debugAuth(`canReassignBug error: ${err}`);
    return res.status(500).json({ 
      message: 'Error checking permissions.' 
    });
  }
}

/**
 * Check if user can classify a bug
 */
export async function canClassifyBug(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }
    
    const { bugId } = req.params;
    const { findBugById } = await import('../database.js');  // ← CORRECT: findBugById
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ 
        message: `Bug ${bugId} not found.` 
      });
    }
    
    const permissions = await getRolePermissions(req.user.role);
    
    if (permissions.includes('canClassifyAnyBug')) {
      return next();
    }
    
    debugAuth(`Classify denied for ${req.user.email} on bug ${bugId}`);
    return res.status(403).json({ 
      message: 'Forbidden. You do not have permission to classify this bug.' 
    });
  } catch (err) {
    debugAuth(`canClassifyBug error: ${err}`);
    return res.status(500).json({ 
      message: 'Error checking permissions.' 
    });
  }
}