import { getDatabase } from "../database.js";
import debug from 'debug';

const debugAuth = debug('app:auth');

/**
 * Middleware to check if user has required permission
 * @param {string} permission - The required permission
 */
export const hasPermission = (permission) => {
  return async (req, res, next) => {
    // Get user role (now a string, not an array)
    const userRole = req.user.role;

    if (!userRole) {
      return res.status(403).json({ error: 'No role assigned to user' });
    }

    // Get database instance
    const db = await getDatabase();

    const roleDocument = await db.collection('role').findOne({ role: userRole });

    debugAuth(`User role: ${userRole}`);
    debugAuth('Role document from DB:', roleDocument);

    // Check if the user's role has the required permission
    const hasRequiredPermission = roleDocument?.permissions?.[permission] === true;

    if (!hasRequiredPermission) {
      return res.status(403).json({
        error: `Permission denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has at least one of the required permissions (OR logic)
 * @param {string[]} permissions - Array of permissions to check
 * @example hasAnyPermission(['canCreateBug', 'canEditBug'])
 */
export const hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user role
    const userRole = req.user.role;

    if (!userRole) {
      return res.status(403).json({ error: 'No role assigned to user' });
    }

    // Get database
    const db = await getDatabase();

    // Fetch role document for user's role
    const roleDocument = await db.collection('role').findOne({ role: userRole });

    // Check if the user's role has any of the required permissions
    const hasRequiredPermission = permissions.some(permission => 
      roleDocument?.permissions?.[permission] === true
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        error: `Permission denied. Required permission (any of): ${permissions.join(', ')}`
      });
    }

    // User has at least one permission, continue to next middleware
    next();
  };
};

/**
 * Middleware to check if user has all of the required permissions (AND logic)
 * @param {string[]} permissions - Array of permissions to check
 * @example hasAllPermissions(['canCreateBug', 'canEditBug'])
 */
export const hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user role
    const userRole = req.user.role;

    if (!userRole) {
      return res.status(403).json({ error: 'No role assigned to user' });
    }

    // Get database
    const db = await getDatabase();

    // Fetch role document for user's role
    const roleDocument = await db.collection('role').findOne({ role: userRole });

    // Collect all permissions the user has
    const userPermissions = new Set();
    if (roleDocument?.permissions) {
      Object.entries(roleDocument.permissions).forEach(([permission, value]) => {
        if (value === true) {
          userPermissions.add(permission);
        }
      });
    }

    // Check if user has all required permissions
    const hasAllRequired = permissions.every(permission =>
      userPermissions.has(permission)
    );

    if (!hasAllRequired) {
      const missingPermissions = permissions.filter(p => !userPermissions.has(p));
      return res.status(403).json({
        error: `Permission denied. Missing permissions: ${missingPermissions.join(', ')}`
      });
    }

    // User has all permissions, continue to next middleware
    next();
  };
};

/**
 * Middleware to check if user can edit a specific bug (must be author or have canEditAnyBug permission)
 */
export const canEditBug = async (req, res, next) => {
  const { bugId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = await getDatabase();
  const bug = await db.collection('bug').findOne({ _id: new (await import('mongodb')).ObjectId(bugId) });

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  // Check if user is the author
  if (bug.author === req.user.email) {
    return next();
  }

  // Check if user has canEditAnyBug permission
  const userRole = req.user.role;
  const roleDocument = await db.collection('role').findOne({ role: userRole });

  if (roleDocument?.permissions?.canEditAnyBug === true) {
    return next();
  }

  return res.status(403).json({ error: 'Permission denied. You can only edit your own bugs or need canEditAnyBug permission.' });
};

/**
 * Middleware to check if user can reassign bugs
 */
export const canReassignBug = hasPermission('canReassignBug');

/**
 * Middleware to check if user can classify bugs
 */
export const canClassifyBug = hasPermission('canClassifyBug');