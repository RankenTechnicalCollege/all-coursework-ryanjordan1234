const { betterAuth } = require('better-auth');
const { mongodbAdapter } = require('better-auth/adapters/mongodb');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

// Create MongoDB client
const client = new MongoClient(process.env.MONGODB_URI);

// Connect to MongoDB
client.connect().then(() => {
  console.log('✅ Better-auth connected to MongoDB');
}).catch((err) => {
  console.error('❌ Better-auth MongoDB connection error:', err);
});

const auth = betterAuth({
  database: mongodbAdapter(client.db(process.env.DB_NAME)),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false // Don't allow users to set their own role
      }
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:2023',
  trustedOrigins: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:2023'
  ]
});

module.exports = auth;