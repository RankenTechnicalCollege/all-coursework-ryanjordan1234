import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();
import debug from 'debug';
const debugIndex = debug('app:index');
import cors from 'cors';
const port = process.env.PORT || 8080;
import { auth } from "./auth.js";
import { toNodeHandler } from "better-auth/node";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
  credentials: true
})); 
app.use(express.static('frontend/dist'));  // ← Changed from vite-project to frontend

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use('/api/users', (await import('./routes/api/users.js')).usersRouter);
app.use('/api/bugs', (await import('./routes/api/bugs.js')).bugRouter);
app.use('/api/bugs', (await import('./routes/api/comments.js')).commentRouter);
app.use('/api/bugs', (await import('./routes/api/tests.js')).testRouter);

// Handle React routing - send all non-API requests to React
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));  // ← Changed from vite-project to frontend
});

app.listen(port, () => {
  debugIndex(`Server running on http://localhost:${port}`)
});