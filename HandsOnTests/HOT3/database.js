const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Get connection details from environment variables
const url = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'ecommerce';

// Validate that MONGODB_URI is defined
if (!url) {
  throw new Error('MONGODB_URI is not defined in environment variables. Please check your .env file.');
}

let db = null;

async function connect() {
  if (db) {
    return db;
  }
  const client = await MongoClient.connect(url);
  db = client.db(dbName);
  console.log(`Connected to MongoDB database: ${dbName}`);
  return db;
}

// Get all products
async function findAllProducts() {
  const database = await connect();
  const products = await database.collection('products').find({}).toArray();
  return products;
}

// Get product by ID
async function findProductById(productId) {
  const database = await connect();
  const product = await database.collection('products').findOne({ _id: new ObjectId(productId) });
  return product;
}

// Get product by name (case-insensitive)
async function findProductByName(productName) {
  const database = await connect();
  const trimmedName = productName.trim();
  
  // Use case-insensitive regex for more flexible matching
  const product = await database.collection('products').findOne({ 
    name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') }
  });
  
  return product;
}

// Helper function to escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create new product
async function createProduct(productData) {
  const database = await connect();
  const result = await database.collection('products').insertOne(productData);
  return result.insertedId;
}

// Update product
async function updateProduct(productId, productData) {
  const database = await connect();
  productData.lastUpdatedOn = new Date();
  const result = await database.collection('products').updateOne(
    { _id: new ObjectId(productId) },
    { $set: productData }
  );
  return result;
}

// Delete product
async function deleteProduct(productId) {
  const database = await connect();
  const result = await database.collection('products').deleteOne({ _id: new ObjectId(productId) });
  return result;
}

// User functions
async function findAllUsers() {
  const database = await connect();
  const users = await database.collection('user').find({}).toArray();
  return users;
}

async function findUserById(userId) {
  const database = await connect();
  const user = await database.collection('user').findOne({ id: userId });
  return user;
}

async function updateUserById(userId, userData) {
  const database = await connect();
  const result = await database.collection('user').updateOne(
    { id: userId },
    { $set: userData }
  );
  return result.modifiedCount > 0;
}

module.exports = {
  connect,
  findAllProducts,
  findProductById,
  findProductByName,
  createProduct,
  updateProduct,
  deleteProduct,
  findAllUsers,
  findUserById,
  updateUserById
};