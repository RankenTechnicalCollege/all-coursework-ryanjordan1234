import express from 'express';
import debug from 'debug';
import { nanoid } from 'nanoid';

const debugUser = debug('app:api:user');
const router = express.Router();

// In-memory storage for users
const users = [
    {userId: 1, username: 'user1', password: 'password1'},
    {userId: 2, username: 'user2', password: 'password2'},
    {userId: 3, username: 'user3', password: 'password3'},
];

// Existing routes
router.get('/list', (req, res) => {
    res.status(200).json(users);
});

router.get('/:userId', (req, res) => {
    const id = req.params.userId;
    const user = users.find(user => user.userId == id);
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).send(`User with ID: ${id} not found`);
    }
});

// POST /api/user/register
router.post('/register', (req, res) => {
  debugUser('POST /api/user/register');
  
  const { email, password, givenName, familyName, role } = req.body;
  
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
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
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
    createdAt: new Date(),
    lastUpdated: new Date()
  };
  
  users.push(newUser);
  debugUser(`User registered: ${email}`);
  
  res.status(200).type('text/plain').send('New user registered!');
});

// POST /api/user/login
router.post('/login', (req, res) => {
  debugUser('POST /api/user/login');
  
  const { email, password } = req.body;
  
  // Validate credentials provided
  if (!email || !password) {
    return res.status(400).type('text/plain').send('Please enter your login credentials.');
  }
  
  // Find user by email and password
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    debugUser(`User logged in: ${email}`);
    return res.status(200).type('text/plain').send('Welcome back!');
  } else {
    debugUser(`Failed login attempt for: ${email}`);
    return res.status(404).type('text/plain').send('Invalid login credential provided. Please try again.');
  }
});

// PUT /api/user/:userId
router.put('/:userId', (req, res) => {
  debugUser('PUT /api/user/:userId');
  
  const { userId } = req.params;
  const { password, fullName, givenName, familyName, role } = req.body;
  
  // Find user by ID
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).type('text/plain').send(`User ${userId} not found.`);
  }
  
  // Update only provided fields
  if (password !== undefined) user.password = password;
  if (fullName !== undefined) user.fullName = fullName;
  if (givenName !== undefined) user.givenName = givenName;
  if (familyName !== undefined) user.familyName = familyName;
  if (role !== undefined) user.role = role;
  
  user.lastUpdated = new Date();
  
  debugUser(`User updated: ${userId}`);
  res.status(200).type('text/plain').send('User updated!');
});

// DELETE /api/user/:userId
router.delete('/:userId', (req, res) => {
  debugUser('DELETE /api/user/:userId');
  
  const { userId } = req.params;
  
  // Find user index
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).type('text/plain').send(`User ${userId} not found.`);
  }
  
  // Remove user from array
  users.splice(userIndex, 1);
  
  debugUser(`User deleted: ${userId}`);
  res.status(200).type('text/plain').send('User deleted!');
});

export {router as userRouter};