const express = require('express');
const Joi = require('joi');
const { ObjectId } = require('mongodb');
const db = require('../../database');
const isAuthenticated = require('../../middleware/isAuthenticated');

const router = express.Router();

// Joi validation schema
const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).default(0),
  imageUrl: Joi.string().uri().optional().allow('')
});

// Update schema (all fields optional)
const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().uri().optional().allow('')
}).min(1); // At least one field required

// GET /api/products/search?name=query - Search products by name
router.get('/search', async (req, res, next) => {
  try {
    const { name } = req.query;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const database = await db.connect();
    const products = await database.collection('products').find({
      name: { $regex: name.trim(), $options: 'i' }
    }).toArray();
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products - Get all products
router.get('/', async (req, res, next) => {
  try {
    const products = await db.findAllProducts();
    res.status(200).json({
      success: true,
      data: products
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const product = await db.findProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create new product (Protected)
router.post('/', isAuthenticated, async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = productSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    // Add metadata
    const productData = {
      ...value,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const productId = await db.createProduct(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        productId: productId.toString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:productId - Update product (Protected)
router.put('/:productId', isAuthenticated, async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    // Check if product exists
    const existingProduct = await db.findProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Validate request body
    const { error, value } = updateProductSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    // Add updated timestamp
    const updateData = {
      ...value,
      updatedAt: new Date()
    };
    
    await db.updateProduct(productId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        productId: productId
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:productId - Delete product (Protected)
router.delete('/:productId', isAuthenticated, async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    // Check if product exists
    const existingProduct = await db.findProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await db.deleteProduct(productId);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;