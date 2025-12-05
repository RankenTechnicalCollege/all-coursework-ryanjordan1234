import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import debug from 'debug';

const debugAuth = debug('app:auth');

const client = new MongoClient(process.env.DB_URL);
let clientPromise;

async function getClientPromise() {
  if (!clientPromise) {
    clientPromise = client.connect();
    debugAuth('Better-auth MongoDB client connected');
  }
  return clientPromise;
}

export const auth = betterAuth({
  // Database configuration
  database: mongodbAdapter(getClientPromise, {
    databaseName: process.env.DB_NAME || "IssueTracker"
  }),
  
  // Base URL configuration - CRITICAL!
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  
  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-please-change-in-production",
  
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5              // 5 minutes
    }
  },
  
  // Additional user fields
  user: {
    additionalFields: {
      givenName: { 
        type: "string", 
        required: false 
      },
      familyName: { 
        type: "string", 
        required: false 
      },
      fullName: {
        type: "string",
        required: false
      },
      role: { 
        type: "string", 
        required: false, 
        defaultValue: null 
      }
    }
  },
  
  // Advanced configuration
  advanced: {
    cookiePrefix: "issue-tracker",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  
  // Trusted origins for CORS
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173"
  ]
});

// Log configuration on startup
debugAuth('Better-auth configured with:');
debugAuth(`  Base URL: ${process.env.BETTER_AUTH_URL || "http://localhost:5000"}`);
debugAuth(`  Database: ${process.env.DB_NAME || "IssueTracker"}`);
debugAuth(`  Frontend: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);