import express from 'express';
// ✅ CORRECT function names from YOUR database.js
import { 
  findAllUsers,           // NOT getUsers
  findUserById,           // NOT getUserById
  findUserByEmail,        // NOT getUserByEmail
  findUsersWithFilters,   // For filtering/pagination
  insertUser,             // NOT addUser
  updateUser,             // ✅ Correct
  deleteUser              // ✅ Correct
} from '../../database.js';

import debug from 'debug';
const debugUsers = debug('app:users');
import { ObjectId } from 'mongodb';
import { isAuthenticated } from '../../middleware/auth.js';

const router = express.Router();

// GET all users with filtering, sorting, pagination
router.get('', async (req, res) => {
  const { keywords, role, minAge, maxAge, page, limit, sortBy } = req.query;

  // Handle pagination parameters
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 0;
  const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

  // Build a query filter
  const filter = {};

  if (keywords) filter.$text = { $search: keywords };
  if (role) filter.role = role;

  // Handle date filtering
  if (minAge || maxAge) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateFilter = {};

    if (maxAge) dateFilter.$gte = new Date(today.getTime() - maxAge * 24 * 60 * 60 * 1000);
    if (minAge) dateFilter.$lte = new Date(today.getTime() - minAge * 24 * 60 * 60 * 1000);

    filter.createdAt = dateFilter;
  }

  const sortOptions = {
    email: { email: 1 },
    createdAt: { createdAt: 1 },
    role: { role: 1 }
  };
  const sort = sortOptions[sortBy] || { role: -1 };

  debugUsers(`Sort is ${JSON.stringify(sort)}`);

  // ✅ CORRECT: Use findUsersWithFilters
  const users = await findUsersWithFilters(filter, sort, skip, limitNum);
  if (!users) {
    res.status(500).send('Error retrieving users');
  } else {
    res.status(200).json(users);
  }
});

// GET /me - current authenticated user
router.get('/me', isAuthenticated, async (req, res) => {
  debugUsers(`Fetching current authenticated user: ${JSON.stringify(req.user)}`);
  res.status(200).json(req.user);
});

// GET user by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // ✅ CORRECT: Use findUserById
  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json(user);
});

// POST - Create new user
// NOTE: Users should register via better-auth at /api/auth/sign-up/email
// But you can keep this for admin purposes
router.post('', async (req, res) => {
  const newUser = req.body;

  // ✅ CORRECT: Use findUserByEmail
  if (await findUserByEmail(newUser.email)) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const today = new Date();
  newUser.createdAt = today;

  // ✅ CORRECT: Use insertUser (NOT addUser)
  const result = await insertUser(newUser);
  if (result.insertedId) {
    res.status(201).json({ ...newUser });
  } else {
    res.status(500).send('Error adding user');
  }
});

// POST /login
// Better-auth handles this at /api/auth/sign-in/email
// Redirect users there or keep for backward compatibility
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  let existingUser = null;
  try {
    // ✅ CORRECT: Use findUserByEmail
    existingUser = await findUserByEmail(email);
  } catch (err) {
    debugUsers(`Error fetching user by email: ${err}`);
  }

  if (!existingUser) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Inform user to use better-auth endpoint
  return res.status(400).json({
    message: 'Please use /api/auth/sign-in/email for login',
    endpoint: '/api/auth/sign-in/email'
  });
});

// PATCH /me - Update current user
router.patch('/me', isAuthenticated, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  const updatedData = req.body;

  debugUsers(`Updating user with ID: ${userId} with data: ${JSON.stringify(updatedData)}`);

  updatedData.lastUpdatedOn = new Date();
  updatedData.lastUpdatedBy = req.user ? req.user.email : 'self';

  // ✅ CORRECT: Use updateUser
  const result = await updateUser(userId, updatedData);
  debugUsers(`Update result: ${JSON.stringify(result)}`);

  if (result.modifiedCount === 1) {
    res.status(200).json({ message: 'User updated successfully' });
  } else {
    res.status(404).json({ message: 'User not updated' });
  }
});

// PATCH /:id - Update user by ID
router.patch('/:id', async (req, res) => {
  const userId = req.params.id;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  const updatedData = req.body;
  debugUsers(`Updating user with ID: ${userId} with data: ${JSON.stringify(updatedData)}`);

  // ✅ CORRECT: Use updateUser
  const result = await updateUser(new ObjectId(userId), updatedData);
  debugUsers(`Update result: ${JSON.stringify(result)}`);

  if (result.modifiedCount === 1) {
    res.status(200).json({ message: 'User updated successfully' });
  } else {
    res.status(404).json({ message: 'User not updated' });
  }
});

// DELETE /:id - Delete user
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // ✅ CORRECT: Use deleteUser
  const results = await deleteUser(new ObjectId(userId));
  if (results.deletedCount === 1) {
    res.status(200).json({ message: 'User deleted successfully' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

export { router as userRouter };