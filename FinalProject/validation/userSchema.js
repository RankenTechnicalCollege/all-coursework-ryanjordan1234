import Joi from 'joi';

// Define a schema for user registration data (POST /api/users)
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  givenName: Joi.string().min(2).optional(),
  familyName: Joi.string().min(2).optional(),
  fullName: Joi.string().min(2).optional(),
  role: Joi.string().valid('user', 'developer', 'tester', 'admin').default('user'),
  createdAt: Joi.date().optional()
}).required();

const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  givenName: Joi.string().min(2).optional(),
  familyName: Joi.string().min(2).optional(),
  fullName: Joi.string().min(2).optional(),
  role: Joi.string().valid('user', 'developer', 'tester', 'admin').optional(),
  lastUpdatedOn: Joi.date().optional(),
  lastUpdatedBy: Joi.string().optional()
}).min(1).required();

export { registerSchema, updateUserSchema };