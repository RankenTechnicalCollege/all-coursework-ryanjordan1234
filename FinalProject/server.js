import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import debug from 'debug';

// Import route modules
import { UserRouter } from './routes/api/user.js';
import { BugRouter } from './routes/api/bug.js';

const app = express();
const port = process.env.PORT || 3000;
const debugServer = debug('app:Server');

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from React's dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.use('/api/user', UserRouter);
app.use('/api/bug', BugRouter);

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(port, () => {
  debugServer(`Server running on http://localhost:${port}`);
  console.log(`Issue Tracker server started on port ${port}`);
});

export default app;