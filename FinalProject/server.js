import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import debug from 'debug';
const debugServer = debug('app:Server');

import { auth } from './lib/auth.js';  // ← Better-auth import

// Your existing imports
import { userRouter } from './routes/api/user.js';
import { bugRouter } from './routes/api/bug.js';
import { commentRouter } from './routes/api/comment.js';
import { testRouter } from './routes/api/test.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORRECT: Better-auth handler (matches all /api/auth routes)
app.use('/api/auth', async (req, res) => {
  return auth.handler(req, res);
});

// Your existing routes
app.use('/api/users', userRouter);
app.use('/api/bugs', bugRouter);
app.use('/api/bugs', commentRouter);  // Comments are under /api/bugs/:bugId/comments
app.use('/api/bugs', testRouter);     // Tests are under /api/bugs/:bugId/tests

app.use(express.static('frontend/dist'));

const port = process.env.port || 5000;
app.listen(port, () => {
  debugServer(`Server running on http://localhost:${port}`);
  console.log(`Server running on http://localhost:${port}`);
});