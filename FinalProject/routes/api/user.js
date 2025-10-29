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

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    debugUser('GET /api/user');
    
    const { keywords, role, maxAge, minAge, sortBy = 'givenName', pageSize = 5, pageNumber = 1 } = req.query;
    
    // Build query filter
    const filter = {};
    
    // Text search
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    // Role filter
    if (role) {
      filter.role = role;
    }
    
    // Age filters (days since creation)
    if (maxAge || minAge) {
      filter.createdAt = {};
      
      if (maxAge) {
        // maxAge: show users created AFTER this date (newer than maxAge days)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - parseInt(maxAge));
        filter.createdAt.$gte = maxDate;
      }
      
      if (minAge) {
        // minAge: show users created BEFORE this date (older than minAge days)
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - parseInt(minAge));
        filter.createdAt.$lt = minDate;
      }
    }
    
    // Build sort options
    let sort = {};
    switch (sortBy) {
      case 'givenName':
        sort = { givenName: 1, familyName: 1, createdAt: 1 };
        break;
      case 'familyName':
        sort = { familyName: 1, givenName: 1, createdAt: 1 };
        break;
      case 'role':
        sort = { role: 1, givenName: 1, familyName: 1, createdAt: 1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      default:
        sort = { givenName: 1, familyName: 1, createdAt: 1 };
    }
    
    // Pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    debugUser('Filter:', filter);
    debugUser('Sort:', sort);
    debugUser('Pagination:', { skip, limit });
    
    const users = await db.findUsersWithFilters(filter, sort, skip, limit);
    res.json(users);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// GET /api/users/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    debugUser('GET /api/user/:userId');
    const { userId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    debugUser(`User found: ${userId}`);
    res.json(user);
  } catch (err) {
    debugUser('Error finding user:', err);
    next(err);
  }
});

// POST /api/users/register
router.post('/register', async (req, res, next) => {
  try {
    debugUser('POST /api/user/register');
    
    // Validate request body with Joi
    const validateResult = registerSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { email, password, fullName, givenName, familyName, role } = req.body;
    
    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      email,
      password: hashedPassword,
      fullName,
      givenName,
      familyName,
      role,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    const result = await db.insertUser(newUser);
    const userId = result.insertedId.toString();
    
    debugUser(`User registered: ${email}`);
    res.status(200).json({ message: 'New user registered!', userId });
  } catch (err) {
    debugUser('Error registering user:', err);
    next(err);
  }
});

// POST /api/users/login
router.post('/login', async (req, res, next) => {
  try {
    debugUser('POST /api/users/login');
    
    // Validate request body with Joi
    const validateResult = loginSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { email, password } = req.body;
    
    // Find user by email
    const user = await db.findUserByEmail(email);
    
    if (!user) {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credential provided. Please try again.' });
    }
    
    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      debugUser(`User logged in: ${email}`);
      return res.status(200).json({ message: 'Welcome back!', userId: user._id.toString() });
    } else {
      debugUser(`Failed login attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid login credential provided. Please try again.' });
    }
  } catch (err) {
    debugUser('Error logging in:', err);
    next(err);
  }
});

// PATCH /api/users/:userId
router.patch('/:userId', async (req, res, next) => {
  try {
    debugUser('PATCH /api/users/:userId');
    
    const { userId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = updateSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { password, fullName, givenName, familyName, role } = req.body;
    
    // Find user by ID
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
    // Build update object with only provided fields
    const updates = {
      lastUpdated: new Date()
    };
    
    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, 10);
    }
    if (fullName !== undefined) updates.fullName = fullName;
    if (givenName !== undefined) updates.givenName = givenName;
    if (familyName !== undefined) updates.familyName = familyName;
    if (role !== undefined) updates.role = role;
    
    await db.updateUser(userId, updates);
    
    debugUser(`User updated: ${userId}`);
    res.status(200).json({ message: `User ${userId} updated!`, userId });
  } catch (err) {
    debugUser('Error updating user:', err);
    next(err);
  }
});

// DELETE /api/users/:userId
router.delete('/:userId', async (req, res, next) => {
  try {
    debugUser('DELETE /api/users/:userId');
    
    const { userId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: `userId ${userId} is not a valid ObjectId.` });
    }
    
    // Find user by ID
    const user = await db.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }
    
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