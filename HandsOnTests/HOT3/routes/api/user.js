const express = require('express');
const router = express.Router();
const dbModule = require('../../database');
const hasRole = require('../../middleware/hasRole');
const isAuthenticated = require('../../middleware/isAuthenticated');
const validate = require('../../middleware/validate');
const validId = require('../../middleware/validId');
const { updateUserSchema } = require('../../schemas/userSchemas');

// GET /api/users - Get all users (admin only)
router.get('/', hasRole('admin'), async (req, res, next) => {
  try {
    const users = await dbModule.findAllUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me - Get logged in user info (MUST come before /:userId)
router.get('/me', isAuthenticated, async (req, res, next) => {
  try {
    const user = await dbModule.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me - Update logged in user (MUST come before /:userId)
router.patch('/me', isAuthenticated, validate(updateUserSchema), async (req, res, next) => {
  try {
    const userData = {};
    
    if (req.body.name) {
      userData.name = req.body.name;
    }
    if (req.body.email) {
      userData.email = req.body.email;
    }
    // Note: Password updates should go through better-auth API
    
    const updated = await dbModule.updateUserById(req.user.id, userData);
    
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      userId: req.user.id
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId - Get user by ID (admin only)
router.get('/:userId', hasRole('admin'), validId('userId'), async (req, res, next) => {
  try {
    const user = await dbModule.findUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;