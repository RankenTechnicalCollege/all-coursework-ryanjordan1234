import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import debug from 'debug';
const debugServer = debug('app:Server');
import { userRouter } from './routes/api/user.js';
import { bugRouter } from './routes/api/bug.js';
import { commentRouter } from './routes/api/comment.js';
import { testRouter } from './routes/api/test.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('frontend/dist'));
app.use('/api/users', userRouter);
app.use('/api/bugs', bugRouter);
app.use('/api/bugs', commentRouter);
app.use('/api/bugs', testRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  debugServer('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  debugServer(`Server running on http://localhost:${port}`);
});