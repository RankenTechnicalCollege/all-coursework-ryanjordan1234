// init-roles.js
// Run this script to initialize the roles collection in your database
// Usage: node init-roles.js

import * as dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

const roles = [
  {
    name: 'Developer',
    permissions: [
      'canViewData',
      'canCreateBug',
      'canEditMyBug',
      'canEditIfAssignedTo',
      'canReassignIfAssignedTo',
      'canBeAssignedTo',
      'canLogHours',
      'canApplyFixInVersion',
      'canAssignVersionDate',
      'canAddComment'
    ]
  },
  {
    name: 'Quality Analyst',
    permissions: [
      'canViewData',
      'canCreateBug',
      'canEditMyBug',
      'canEditIfAssignedTo',
      'canReassignIfAssignedTo',
      'canBeAssignedTo',
      'canAddComment',
      'canAddTestCase',
      'canEditTestCase',
      'canDeleteTestCase'
    ]
  },
  {
    name: 'Business Analyst',
    permissions: [
      'canViewData',
      'canCreateBug',
      'canEditAnyBug',
      'canCloseAnyBug',
      'canClassifyAnyBug',
      'canReassignAnyBug',
      'canEditMyBug',
      'canEditIfAssignedTo',
      'canReassignIfAssignedTo',
      'canBeAssignedTo',
      'canAddComment'
    ]
  },
  {
    name: 'Product Manager',
    permissions: [
      'canViewData',
      'canCreateBug',
      'canEditMyBug',
      'canEditIfAssignedTo',
      'canReassignIfAssignedTo',
      'canAddComment'
    ]
  },
  {
    name: 'Technical Manager',
    permissions: [
      'canEditAnyUser',
      'canViewData',
      'canAssignRoles',
      'canCreateBug',
      'canReassignAnyBug',
      'canEditMyBug',
      'canEditIfAssignedTo',
      'canReassignIfAssignedTo',
      'canAddComment'
    ]
  }
];

async function initializeRoles() {
  let client;
  
  try {
    const dbUrl = process.env.DB_URL;
    const dbName = process.env.DB_NAME;
    
    if (!dbUrl || !dbName) {
      throw new Error('DB_URL and DB_NAME must be set in environment variables');
    }
    
    console.log('Connecting to database...');
    client = await MongoClient.connect(dbUrl);
    const db = client.db(dbName);
    
    console.log('Clearing existing roles...');
    await db.collection('role').deleteMany({});
    
    console.log('Inserting new roles...');
    const result = await db.collection('role').insertMany(roles);
    
    console.log(`Successfully inserted ${result.insertedCount} roles:`);
    roles.forEach(role => {
      console.log(`  - ${role.name} (${role.permissions.length} permissions)`);
    });
    
    console.log('\nRoles initialization complete!');
    
  } catch (error) {
    console.error('Error initializing roles:', error);
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