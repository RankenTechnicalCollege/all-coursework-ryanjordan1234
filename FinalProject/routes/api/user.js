import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import bcrypt from 'bcrypt';

const debugUser = debug('app:api:user');
const router = express.Router();

// Joi Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().required(),
  givenName: Joi.string().required(),
  familyName: Joi.string().required(),
  role: Joi.string().valid('Developer', 'Business Analyst', 'Quality Analyst', 'Product Manager', 'Technical Manager').required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateSchema = Joi.object({
  password: Joi.string().min(6).optional(),
  fullName: Joi.string().optional(),
  givenName: Joi.string().optional(),
  familyName: Joi.string().optional(),
  role: Joi.string().valid('Developer', 'Business Analyst', 'Quality Analyst', 'Product Manager', 'Technical Manager').optional()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// Authentication middleware - checks if user is logged in
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  req.user = req.session.user; // Make user data available via req.user
  next();
};

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

// POST /api/auth/sign-up/email
router.post('/auth/sign-up/email', async (req, res, next) => {
  try {
    debugUser('POST /api/auth/sign-up/email');
    
    // Validate request body with Joi
    const validateResult = registerSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { email, password, fullName, givenName, familyName, role } = req.body;
    
    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user with all required fields
    const newUser = {
      email,
      password: hashedPassword,
      fullName,
      givenName,
      familyName,
      role,
      createdOn: new Date(),
      createdBy: { email, fullName },  // Self-registration
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email, fullName }
    };
    
    const result = await db.insertUser(newUser);
    const userId = result.insertedId.toString();
    
    // Create session cookie
    req.session.user = {
      userId,
      email,
      fullName,
      givenName,
      familyName,
      role
    };
    
    debugUser(`User registered and logged in: ${email}`);
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

// POST /api/auth/sign-in/email
router.post('/auth/sign-in/email', async (req, res, next) => {
  try {
    debugUser('POST /api/auth/sign-in/email');
    
    // Validate request body with Joi
    const validateResult = loginSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { email, password } = req.body;
    
    // Find user by email
    const user = await db.findUserByEmail(email);
    
    if (!user) {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credentials provided. Please try again.' });
    }
    
    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credentials provided. Please try again.' });
    }
    
    // Create session cookie
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
      res.clearCookie('connect.sid'); // Default session cookie name
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  } else {
    res.status(200).json({ message: 'No active session.' });
  }
});

// GET /api/users/me - View own profile
router.get('/users/me', requireAuth, async (req, res, next) => {
  try {
    debugUser('GET /api/users/me');
    
    const user = await db.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Remove password from response
    delete user.password;
    
    res.json(user);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// PATCH /api/users/me - Edit own profile
router.patch('/users/me', requireAuth, async (req, res, next) => {
  try {
    debugUser('PATCH /api/users/me');
    
    // Validate request body with Joi
    const validateResult = updateSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { password, fullName, givenName, familyName, role } = req.body;
    
    // Build update object with only provided fields
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
    
    // Only update if there are changes
    if (Object.keys(changedFields).length > 0) {
      await db.updateUser(req.user.userId, updates);
      
      // Track the edit
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

// GET /api/users - WITH SEARCH FUNCTIONALITY (Exercise 1)
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    debugUser('GET /api/users');
    
    // Extract query parameters with defaults
    const { 
      keywords, 
      role, 
      maxAge, 
      minAge, 
      sortBy = 'givenName', 
      pageSize = 5, 
      pageNumber = 1 
    } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    if (role) {
      filter.role = role;
    }
    
    // Age filters (days since creation)
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
    
    // Build sort options
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
    
    // Pagination calculations
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    // Query database
    const users = await db.findUsersWithFilters(filter, sort, skip, limit);
    res.json(users);
  } catch (err) {
    debugUser('Error finding users:', err);
    next(err);
  }
});

// GET /api/users/:userId
router.get('/users/:userId', requireAuth, async (req, res, next) => {
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
    
    // Remove password from response
    delete user.password;
    
    debugUser(`User found: ${userId}`);
    res.json(user);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// PATCH /api/users/:userId - Admin route to update other users
router.patch('/users/:userId', requireAuth, async (req, res, next) => {
  try {
    debugUser('PATCH /api/users/:userId');
    
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = updateSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { password, fullName, givenName, familyName, role } = req.body;
    
    // Find user by ID
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    // Build update object
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
    
    // Only update if there are changes
    if (Object.keys(changedFields).length > 0) {
      await db.updateUser(userId, updates);
      
      // Track the edit
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

// DELETE /api/users/:userId - Admin route
router.delete('/users/:userId', requireAuth, async (req, res, next) => {
  try {
    debugUser('DELETE /api/users/:userId');
    
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    // Find user by ID
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    // Track the delete before actually deleting
    await trackEdit(
      'user',
      'delete',
      { userId },
      {},
      req.user.email
    );
    
    // Delete user
    await db.deleteUser(userId);
    
    debugUser(`User deleted: ${userId}`);
    res.status(200).json({ message: `User ${userId} deleted!`, userId });
  } catch (err) {
    debugUser('Error deleting user:', err);
    next(err);
  }
});

export { router as userRouter };