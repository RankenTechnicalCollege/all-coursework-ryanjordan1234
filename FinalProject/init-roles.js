// init-roles.js
// Run this script to initialize the roles collection in your database
// Usage: node init-roles.js

import * as dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

const roles = [
  {
    role: 'user',  // Changed from 'name' to 'role'
    canViewData: true,
    canCreateBug: true,
    canEditMyBug: true,
    canComment: true,
    canCreateTest: false,
    canEditTest: false,
    canDeleteTest: false,
    canEditAnyBug: false,
    canEditIfAssignedTo: false,
    canReassignAnyBug: false,
    canReassignMyBug: false,
    canClassifyAnyBug: false,
    canDeleteBug: false
  },
  {
    role: 'developer',
    canViewData: true,
    canCreateBug: true,
    canEditMyBug: true,
    canEditIfAssignedTo: true,
    canComment: true,
    canCreateTest: true,
    canEditTest: true,
    canDeleteTest: false,
    canEditAnyBug: false,
    canReassignAnyBug: false,
    canReassignMyBug: true,
    canClassifyAnyBug: false,
    canDeleteBug: false
  },
  {
    role: 'tester',
    canViewData: true,
    canCreateBug: true,
    canEditMyBug: true,
    canComment: true,
    canCreateTest: true,
    canEditTest: true,
    canDeleteTest: true,
    canEditAnyBug: false,
    canEditIfAssignedTo: false,
    canReassignAnyBug: false,
    canReassignMyBug: false,
    canClassifyAnyBug: true,
    canDeleteBug: false
  },
  {
    role: 'admin',
    canViewData: true,
    canCreateBug: true,
    canEditMyBug: true,
    canEditAnyBug: true,
    canEditIfAssignedTo: true,
    canReassignAnyBug: true,
    canReassignMyBug: true,
    canClassifyAnyBug: true,
    canComment: true,
    canCreateTest: true,
    canEditTest: true,
    canDeleteTest: true,
    canDeleteBug: true
  }
];

async function initializeRoles() {
  let client;
  
  try {
    const dbUrl = process.env.MONGO_URI;  // Changed from DB_URL to MONGO_URI
    const dbName = process.env.DB_NAME;
    
    if (!dbUrl || !dbName) {
      throw new Error('MONGO_URI and DB_NAME must be set in environment variables');
    }
    
    console.log('Connecting to database...');
    client = await MongoClient.connect(dbUrl);
    const db = client.db(dbName);
    
    console.log('Clearing existing roles...');
    await db.collection('role').deleteMany({});
    
    console.log('Inserting new roles...');
    const result = await db.collection('role').insertMany(roles);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} roles:`);
    roles.forEach(role => {
      const permCount = Object.keys(role).filter(k => k.startsWith('can')).length;
      console.log(`  - ${role.role} (${permCount} permissions)`);
    });
    
    console.log('\n✅ Roles initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing roles:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the initialization
initializeRoles();