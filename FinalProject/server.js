import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import debug from 'debug';
const debugServer = debug('app:Server');
import { userRouter } from './routes/api/user.js';
import { bugRouter } from './routes/api/bug.js';

const app = express();

app.use(express.json());  // ADD THIS LINE
app.use(express.urlencoded({ extended: true }));

app.use(express.static('frontend/dist'));
app.use('/api/user', userRouter);
app.use('/api/bug', bugRouter);

const port = process.env.PORT || 3000;

app.listen(port,() => {
    debugServer(`Server running on port http://localhost:${port}`);
});