const express = require('express');
const Joi = require('joi');
const { ObjectId } = require('mongodb');
const db = require('../../database');

const router = express.Router();

// Joi validation schema
const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().required()
});

// GET /api/products/name/:productName - Get product by name (MUST come before /:productId)
router.get('/name/:productName', async (req, res, next) => {
  try {
    const { productName } = req.params;
    const product = await db.findProductByName(productName);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/products - Get all products
router.get('/', async (req, res, next) => {
  try {
    const products = await db.findAllProducts();
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:productId - Get product by ID
router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(404).json({ message: 'Invalid product ID' });
    }
    
    const product = await db.findProductById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = productSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const productId = await db.createProduct(value);
    
    res.status(200).json({
      message: 'Product created successfully',
      productId: productId
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:productId - Update product
router.patch('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(404).json({ message: 'Invalid product ID' });
    }
    
    // Check if product exists
    const existingProduct = await db.findProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Validate request body
    const { error, value } = productSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const result = await db.updateProduct(productId, value);
    
    res.status(200).json({
      message: 'Product updated successfully',
      productId: productId
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:productId - Delete product
router.delete('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(404).json({ message: 'Invalid product ID' });
    }
    
    // Check if product exists
    const existingProduct = await db.findProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await db.deleteProduct(productId);
    
    res.status(200).json({
      message: 'Product deleted successfully',
      productId: productId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;