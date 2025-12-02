import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import bcrypt from 'bcrypt';
import { isAuthenticated, hasPermission } from '../../middleware/auth.js';

const debugUser = debug('app:api:user');
const router = express.Router();

// Joi Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().required(),
  givenName: Joi.string().required(),
  familyName: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Updated to allow role to be string or array
const updateSchema = Joi.object({
  password: Joi.string().min(6).optional(),
  fullName: Joi.string().optional(),
  givenName: Joi.string().optional(),
  familyName: Joi.string().optional(),
  role: Joi.alternatives().try(
    Joi.string().valid('Developer', 'Business Analyst', 'Quality Analyst', 'Product Manager', 'Technical Manager'),
    Joi.array().items(Joi.string().valid('Developer', 'Business Analyst', 'Quality Analyst', 'Product Manager', 'Technical Manager'))
  ).optional()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// Helper function to track edits
const trackEdit = async (col, op, target, update, performedBy) => {
  const editRecord = {
    timestamp: new Date(),
    col,
    op,
    target,
    update,
    performedBy
  };
  await db.insertEdit(editRecord);
};

// POST /api/auth/sign-up/email - No permission required
router.post('/auth/sign-up/email', async (req, res, next) => {
  try {
    debugUser('POST /api/auth/sign-up/email');
    
    const validateResult = registerSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { email, password, fullName, givenName, familyName } = req.body;
    
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Anonymous users do not receive a role initially
    const newUser = {
      email,
      password: hashedPassword,
      fullName,
      givenName,
      familyName,
      role: null, // No role initially
      createdOn: new Date(),
      createdBy: { email, fullName },
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email, fullName }
    };
    
    const result = await db.insertUser(newUser);
    const userId = result.insertedId.toString();
    
    req.session.user = {
      userId,
      email,
      fullName,
      givenName,
      familyName,
      role: null
    };
    
    debugUser(`User registered: ${email} (no role assigned)`);
    res.status(201).json({ 
      message: 'New user registered!', 
      userId,
      user: req.session.user 
    });
  } catch (err) {
    debugUser('Error registering user:', err);
    next(err);
  }
});

// POST /api/auth/sign-in/email - No permission required
router.post('/auth/sign-in/email', async (req, res, next) => {
  try {
    debugUser('POST /api/auth/sign-in/email');
    
    const validateResult = loginSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { email, password } = req.body;
    const user = await db.findUserByEmail(email);
    
    if (!user) {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credentials provided. Please try again.' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credentials provided. Please try again.' });
    }
    
    req.session.user = {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      givenName: user.givenName,
      familyName: user.familyName,
      role: user.role
    };
    
    debugUser(`User logged in: ${email}`);
    res.status(200).json({ 
      message: 'Welcome back!', 
      userId: user._id.toString(),
      user: req.session.user
    });
  } catch (err) {
    debugUser('Error logging in:', err);
    next(err);
  }
});

// POST /api/auth/sign-out
router.post('/auth/sign-out', (req, res) => {
  debugUser('POST /api/auth/sign-out');
  
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out.' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  } else {
    res.status(200).json({ message: 'No active session.' });
  }
});

// GET /api/users - Requires canViewData permission
router.get('/users', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugUser('GET /api/users');
    
    const { 
      keywords, 
      role, 
      maxAge, 
      minAge, 
      sortBy = 'givenName', 
      pageSize = 5, 
      pageNumber = 1 
    } = req.query;
    
    const filter = {};
    
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (maxAge || minAge) {
      filter.createdOn = {};
      
      if (maxAge) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - parseInt(maxAge));
        filter.createdOn.$gte = maxDate;
      }
      
      if (minAge) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - parseInt(minAge));
        filter.createdOn.$lt = minDate;
      }
    }
    
    let sort = {};
    switch (sortBy) {
      case 'givenName':
        sort = { givenName: 1, familyName: 1, createdOn: 1 };
        break;
      case 'familyName':
        sort = { familyName: 1, givenName: 1, createdOn: 1 };
        break;
      case 'role':
        sort = { role: 1, givenName: 1, familyName: 1, createdOn: 1 };
        break;
      case 'newest':
        sort = { createdOn: -1 };
        break;
      case 'oldest':
        sort = { createdOn: 1 };
        break;
      default:
        sort = { givenName: 1, familyName: 1, createdOn: 1 };
    }
    
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    const users = await db.findUsersWithFilters(filter, sort, skip, limit);
    
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(sanitizedUsers);
  } catch (err) {
    debugUser('Error finding users:', err);
    next(err);
  }
});

// GET /api/users/me - Any logged in user
router.get('/users/me', isAuthenticated, async (req, res, next) => {
  try {
    debugUser('GET /api/users/me');
    
    const user = await db.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    delete user.password;
    res.json(user);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// GET /api/users/:userId - Requires canViewData permission
router.get('/users/:userId', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugUser('GET /api/users/:userId');
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    delete user.password;
    
    debugUser(`User found: ${userId}`);
    res.json(user);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// PATCH /api/users/me - Any logged in user, cannot change own role
router.patch('/users/me', isAuthenticated, async (req, res, next) => {
  try {
    debugUser('PATCH /api/users/me');
    
    const validateResult = updateSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { password, fullName, givenName, familyName, role } = req.body;
    
    // Do not allow user to change their own role
    if (role !== undefined) {
      return res.status(403).json({ 
        error: 'Forbidden. You cannot change your own role.' 
      });
    }
    
    const updates = {
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
    };
    
    const changedFields = {};
    
    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, 10);
      changedFields.password = '[REDACTED]';
    }
    if (fullName !== undefined) {
      updates.fullName = fullName;
      changedFields.fullName = fullName;
    }
    if (givenName !== undefined) {
      updates.givenName = givenName;
      changedFields.givenName = givenName;
    }
    if (familyName !== undefined) {
      updates.familyName = familyName;
      changedFields.familyName = familyName;
    }
    
    if (Object.keys(changedFields).length > 0) {
      await db.updateUser(req.user.userId, updates);
      
      await trackEdit(
        'user',
        'update',
        { userId: req.user.userId },
        changedFields,
        req.user.email
      );
    }
    
    debugUser(`User updated their own profile: ${req.user.userId}`);
    res.status(200).json({ message: 'Profile updated successfully!', userId: req.user.userId });
  } catch (err) {
    debugUser('Error updating user:', err);
    next(err);
  }
});

// PATCH /api/users/:userId - Requires canEditAnyUser permission
router.patch('/users/:userId', isAuthenticated, hasPermission('canEditAnyUser'), async (req, res, next) => {
  try {
    debugUser('PATCH /api/users/:userId');
    
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    const validateResult = updateSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { password, fullName, givenName, familyName, role } = req.body;
    
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    const updates = {
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
    };
    
    const changedFields = {};
    
    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, 10);
      changedFields.password = '[REDACTED]';
    }
    if (fullName !== undefined) {
      updates.fullName = fullName;
      changedFields.fullName = fullName;
    }
    if (givenName !== undefined) {
      updates.givenName = givenName;
      changedFields.givenName = givenName;
    }
    if (familyName !== undefined) {
      updates.familyName = familyName;
      changedFields.familyName = familyName;
    }
    if (role !== undefined) {
      updates.role = role;
      changedFields.role = role;
    }
    
    if (Object.keys(changedFields).length > 0) {
      await db.updateUser(userId, updates);
      
      await trackEdit(
        'user',
        'update',
        { userId },
        changedFields,
        req.user.email
      );
    }
    
    debugUser(`User updated: ${userId}`);
    res.status(200).json({ message: `User ${userId} updated!`, userId });
  } catch (err) {
    debugUser('Error updating user:', err);
    next(err);
  }
});

// DELETE /api/users/:userId - Requires canEditAnyUser permission
router.delete('/users/:userId', isAuthenticated, hasPermission('canEditAnyUser'), async (req, res, next) => {
  try {
    debugUser('DELETE /api/users/:userId');
    
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    await trackEdit(
      'user',
      'delete',
      { userId },
      {},
      req.user.email
    );
    
    await db.deleteUser(userId);
    
    debugUser(`User deleted: ${userId}`);
    res.status(200).json({ message: `User ${userId} deleted!`, userId });
  } catch (err) {
    debugUser('Error deleting user:', err);
    next(err);
  }
});

export { router as userRouter };