const Joi = require('joi');

// Schema for updating user profile
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional()
}).min(1); // At least one field must be provided

// Schema for user registration (for reference)
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Schema for login (for reference)
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

module.exports = {
  updateUserSchema,
  registerSchema,
  loginSchema
};