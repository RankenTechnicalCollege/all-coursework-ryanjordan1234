import * as dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from "mongodb";
import debug from 'debug';
const debugDb = debug('app:Database');

/** Generate/Parse an ObjectId */
const newId = (str) => ObjectId.createFromHexString(str);

/** Global variable storing the open connection, do not use it directly. */
let _db = null;

/** Connect to the database */
async function connect() {
  if (!_db) {
    const dbUrl = process.env.DB_URL;
    const dbName = process.env.DB_NAME;
    const client = await MongoClient.connect(dbUrl);
    _db = client.db(dbName);
    debugDb('Connected.');
  }
  return _db;
}

/** Connect to the database and verify the connection */
async function ping() {
  const db = await connect();
  await db.command({ ping: 1 });
  debugDb('Ping.');
}


/** Find all users */
async function findAllUsers() {
  const db = await connect();
  const users = await db.collection('user').find({}).toArray();
  return users;
}

/** Find users with filters, sorting, and pagination */
async function findUsersWithFilters(filter, sort, skip, limit) {
  debugDb('Finding users with filters:', filter, sort, skip, limit);
  const db = await connect();
  const users = await db.collection('user')
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();
  return users;
}

/** Find user by ID */
async function findUserById(userId) {
  const db = await connect();
  const users = await db.collection('user').findOne({ _id: new ObjectId(userId) });
  return users;
}

/** Find user by email */
async function findUserByEmail(email) {
  const db = await connect();
  const users = await db.collection('user').findOne({ email });
  return users;
}

/** Insert a new user */
async function insertUser(user) {
  const db = await connect();
  const result = await db.collection('user').insertOne(user);
  return result;
}

/** Update user by ID */
async function updateUser(userId, updates) {
  const db = await connect();
  const result = await db.collection('user').updateOne(
    { _id: new ObjectId(userId) },
    { $set: updates }
  );
  return result;
}

/** Delete user by ID */
async function deleteUser(userId) {
  const db = await connect();
  const result = await db.collection('user').deleteOne({ _id: new ObjectId(userId) });
  return result;
}

// ==================== BUG FUNCTIONS ====================

/** Find all bugs */
async function findAllBugs() {
  const db = await connect();
  const bugs = await db.collection('bug').find({}).toArray();
  return bugs;
}

/** Find bugs with filters, sorting, and pagination */
async function findBugsWithFilters(filter, sort, skip, limit) {
  const db = await connect();
  const bugs = await db.collection('bug')
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();
  return bugs;
}

/** Find bug by ID */
async function findBugById(bugId) {
  const db = await connect();
  const bug = await db.collection('bug').findOne({ _id: new ObjectId(bugId) });
  return bug;
}

/** Insert a new bug */
async function insertBug(bug) {
  const db = await connect();
  const result = await db.collection('bug').insertOne(bug);
  return result;
}

/** Update bug by ID */
async function updateBug(bugId, updates) {
  const db = await connect();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $set: updates }
  );
  return result;
}

/** Delete bug by ID */
async function deleteBug(bugId) {
  const db = await connect();
  const result = await db.collection('bug').deleteOne({ _id: new ObjectId(bugId) });
  return result;
}


/** Add a comment to a bug */
async function addCommentToBug(bugId, comment) {
  const db = await connect();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $push: { comments: comment } }
  );
  return result;
}


/** Add a test case to a bug */
async function addTestCaseToBug(bugId, testCase) {
  const db = await connect();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $push: { testCases: testCase } }
  );
  return result;
}

/** Update a test case in a bug */
async function updateTestCase(bugId, testId, updates) {
  const db = await connect();
  const updateFields = {};
  for (const [key, value] of Object.entries(updates)) {
    updateFields[`testCases.$.${key}`] = value;
  }
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId), 'testCases._id': new ObjectId(testId) },
    { $set: updateFields }
  );
  return result;
}

/** Delete a test case from a bug */
async function deleteTestCase(bugId, testId) {
  const db = await connect();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $pull: { testCases: { _id: new ObjectId(testId) } } }
  );
  return result;
}

// export functions
export {
  newId,
  connect,
  ping,
  findAllUsers,
  findUsersWithFilters,
  findUserById,
  findUserByEmail,
  insertUser,
  updateUser,
  deleteUser,
  findAllBugs,
  findBugsWithFilters,
  findBugById,
  insertBug,
  updateBug,
  deleteBug,
  addCommentToBug,
  addTestCaseToBug,
  updateTestCase,
  deleteTestCase,
};

// test the database connection
ping()