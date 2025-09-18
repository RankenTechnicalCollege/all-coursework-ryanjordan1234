import express from 'express';
const router = express.Router();

import debug from 'debug';
const debugUser = debug('app:UserRouter');

router.use(express.urlencoded({extended: false}));

//FIXME: use this array to store user data in for now
//we will replace this with a database in a later assignment
const usersArray = [];

import { nanoid } from 'nanoid';

router.get('/list', (req, res) => {
  debugUser('user list route hit');
  res.json(usersArray);
});

// GET /api/user/:userId - Get specific user by ID (5pts)
router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  debugUser(`Getting user with ID: ${userId}`);
  
  const user = usersArray.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      message: `User ${userId} not found.`
    });
  }
  
  res.json(user);
});

// POST /api/user/register - Register new user (10pts)
router.post('/register', (req, res) => {
  const { email, password, givenName, familyName, role } = req.body;
  
  debugUser('User registration attempt');
  
  // Validate required fields
  if (!email) {
    return res.status(400).type('text/plain').send('Email is required.');
  }
  if (!password) {
    return res.status(400).type('text/plain').send('Password is required.');
  }
  if (!givenName) {
    return res.status(400).type('text/plain').send('Given name is required.');
  }
  if (!familyName) {
    return res.status(400).type('text/plain').send('Family name is required.');
  }
  if (!role) {
    return res.status(400).type('text/plain').send('Role is required.');
  }
  
  // Check if email already exists
  const existingUser = usersArray.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).type('text/plain').send('Email already registered.');
  }
  
  // Create new user
  const newUser = {
    id: nanoid(),
    email,
    password,
    givenName,
    familyName,
    role,
    createdOn: new Date(),
    lastUpdated: new Date()
  };
  
  usersArray.push(newUser);
  debugUser(`New user registered: ${email}`);
  
  res.status(200).type('text/plain').send('New user registered!');
});

// POST /api/user/login - Verify login credentials (10pts)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  debugUser('User login attempt');
  
  // Validate required fields
  if (!email || !password) {
    return res.status(400).type('text/plain').send('Please enter your login credentials.');
  }
  
  // Find user and verify credentials
  const user = usersArray.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(404).type('text/plain').send('Invalid login credential provided. Please try again.');
  }
  
  debugUser(`User login successful: ${email}`);
  res.status(200).type('text/plain').send('Welcome back!');
});

// PUT /api/user/:userId - Update existing user (10pts)
router.put('/:userId', (req, res) => {
  const userId = req.params.userId;
  const { password, fullName, givenName, familyName, role } = req.body;
  
  debugUser(`Updating user with ID: ${userId}`);
  
  const user = usersArray.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).type('text/plain').send(`User ${userId} not found.`);
  }
  
  // Update only provided fields
  if (password !== undefined) user.password = password;
  if (fullName !== undefined) user.fullName = fullName;
  if (givenName !== undefined) user.givenName = givenName;
  if (familyName !== undefined) user.familyName = familyName;
  if (role !== undefined) user.role = role;
  
  // Update lastUpdated timestamp
  user.lastUpdated = new Date();
  
  debugUser(`User ${userId} updated successfully`);
  res.status(200).type('text/plain').send('User updated!');
});

// DELETE /api/user/:userId - Delete user (5pts)
router.delete('/:userId', (req, res) => {
  const userId = req.params.userId;
  
  debugUser(`Deleting user with ID: ${userId}`);
  
  const userIndex = usersArray.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).type('text/plain').send(`User ${userId} not found.`);
  }
  
  // Remove user from array
  usersArray.splice(userIndex, 1);
  
  debugUser(`User ${userId} deleted successfully`);
  res.status(200).type('text/plain').send('User deleted!');
});

export { router as UserRouter };