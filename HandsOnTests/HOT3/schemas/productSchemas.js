const Joi = require('joi');

const newProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required()
});

const updateProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required()
});

module.exports = {
  newProductSchema,
  updateProductSchema
};