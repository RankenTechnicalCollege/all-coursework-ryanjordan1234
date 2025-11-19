const Joi = require('joi');

const newProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required()
});

// Add this schema at the top with productSchema
const updateProductSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  category: Joi.string(),
  price: Joi.number()
}).min(1); // At least one field must be present

// Then in your PATCH route, change this line:
const { error, value } = updateProductSchema.validate(req.body);

module.exports = {
  newProductSchema,
  updateProductSchema
};
