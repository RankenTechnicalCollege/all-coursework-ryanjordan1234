import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import debug from 'debug';
const debugServer = debug('app:Server');

import { userRouter } from './routes/api/user.js';
import { bugRouter } from './routes/api/bug.js';
import { commentRouter } from './routes/api/comment.js';
import { testRouter } from './routes/api/test.js';

const app = express();

// 1. CORS MUST BE FIRST!
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// 2. Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session middleware (REQUIRED FOR AUTH!)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: false, // set to true in production with HTTPS
    sameSite: 'lax'
  }
}));

// 4. API Routes
app.use('/api', userRouter);
app.use('/api/bugs', bugRouter);
app.use('/api/bugs', commentRouter);
app.use('/api/bugs', testRouter);

// 5. Static files - YOUR LINE IS HERE
app.use(express.static('vite-project/dist'));

// 6. Error handling middleware (must be last)
app.use((err, req, res, next) => {
  debugServer('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  debugServer(`Server running on http://localhost:${port}`);
  console.log(`Server running on http://localhost:${port}`);
});