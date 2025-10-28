const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'ecommerce';

let db = null;

async function connect() {
  if (db) {
    return db;
  }
  const client = await MongoClient.connect(url);
  db = client.db(dbName);
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

// Get product by name
async function findProductByName(productName) {
  const database = await connect();
  const product = await database.collection('products').findOne({ name: productName });
  return product;
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

module.exports = {
  connect,
  findAllProducts,
  findProductById,
  findProductByName,
  createProduct,
  updateProduct,
  deleteProduct
};