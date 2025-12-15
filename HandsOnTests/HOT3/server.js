const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const auth = require('./auth');
const productRoutes = require('./routes/api/products');
const userRoutes = require('./routes/api/user');

// Load environment variables first
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 2023;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Better-auth routes - MUST come before other routes
app.all('/api/auth/*', (req, res) => {
  return auth.handler(req, res);
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`✅ Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});