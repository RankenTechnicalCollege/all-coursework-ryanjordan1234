import { MongoClient, ObjectId } from 'mongodb';
import debug from "debug";
const debugDb = debug("app:Database");

let _db = null;
let _client = null;

async function connectToDatabase() {
  if (!_db) {
    const connectionString = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME;

    const client = await MongoClient.connect(connectionString);
    _db = client.db(dbName);
    debugDb('Connected.');
  }
  return _db;
}

async function ping() {
  const db = await connectToDatabase();
  const pong = await db.command({ ping: 1 });
  debugDb(`Ping:, ${JSON.stringify(pong)}`);
}

// Alias for compatibility
async function connect() {
  return await connectToDatabase();
}

// ==================== USER FUNCTIONS ====================

/** Find all users */
async function findAllUsers() {
  const db = await connectToDatabase();
  const users = await db.collection('user').find({}).toArray();
  return users;
}

/** Find users with filters, sorting, and pagination */
async function findUsersWithFilters(filter, sort, skip, limit) {
  debugDb('Finding users with filters:', filter, sort, skip, limit);
  const db = await connectToDatabase();
  let query = db.collection('user').find(filter).sort(sort);

  if (skip > 0) {
    query = query.skip(skip);
  }

  if (limit > 0) {
    query = query.limit(limit);
  }
  return query.toArray();
}

/** Find user by ID */
async function findUserById(userId) {
  const db = await connectToDatabase();
  const user = await db.collection('user').findOne({ _id: new ObjectId(userId) });
  return user;
}

/** Find user by email */
async function findUserByEmail(email) {
  const db = await connectToDatabase();
  const user = await db.collection('user').findOne({ email: email });
  return user;
}

/** Insert a new user */
async function insertUser(user) {
  const db = await connectToDatabase();
  user._id = new ObjectId();
  return db.collection('user').insertOne(user);
}

/** Update user by ID */
async function updateUser(userId, updatedUser) {
  const db = await connectToDatabase();
  debugDb(`Updating user ${userId} with data: ${JSON.stringify(updatedUser)}`);
  const result = await db.collection('user').updateOne({ _id: new ObjectId(userId) }, { $set: updatedUser });
  return result;
}

/** Delete user by ID */
async function deleteUser(userId) {
  const db = await connectToDatabase();
  const result = await db.collection('user').deleteOne({ _id: new ObjectId(userId) });
  return result;
}

// Legacy function names for backward compatibility
async function getUsers(filter, sort, limit = 0, skip = 0) {
  return await findUsersWithFilters(filter, sort, skip, limit);
}

async function getUserById(userId) {
  return await findUserById(userId);
}

async function addUser(user) {
  return await insertUser(user);
}

async function getUserByEmail(email) {
  return await findUserByEmail(email);
}

// ==================== BUG FUNCTIONS ====================

/** Find all bugs */
async function findAllBugs() {
  const db = await connectToDatabase();
  const bugs = await db.collection('bug').find({}).toArray();
  return bugs;
}

/** Find bugs with filters, sorting, and pagination */
async function findBugsWithFilters(filter, sort, skip, limit) {
  const db = await connectToDatabase();
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
  const db = await connectToDatabase();
  const bug = await db.collection('bug').findOne({ _id: new ObjectId(bugId) });
  return bug;
}

/** Insert a new bug */
async function insertBug(bug) {
  const db = await connectToDatabase();
  const result = await db.collection('bug').insertOne(bug);
  return result;
}

/** Update bug by ID */
async function updateBug(bugId, updates) {
  const db = await connectToDatabase();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $set: updates }
  );
  return result;
}

/** Delete bug by ID */
async function deleteBug(bugId) {
  const db = await connectToDatabase();
  const result = await db.collection('bug').deleteOne({ _id: new ObjectId(bugId) });
  return result;
}

// ==================== COMMENT FUNCTIONS ====================

/** Add a comment to a bug */
async function addCommentToBug(bugId, comment) {
  const db = await connectToDatabase();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $push: { comments: comment } }
  );
  return result;
}

// ==================== TEST CASE FUNCTIONS ====================

/** Add a test case to a bug */
async function addTestCaseToBug(bugId, testCase) {
  const db = await connectToDatabase();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $push: { testCases: testCase } }
  );
  return result;
}

/** Update a test case in a bug */
async function updateTestCase(bugId, testId, updates) {
  const db = await connectToDatabase();
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
  const db = await connectToDatabase();
  const result = await db.collection('bug').updateOne(
    { _id: new ObjectId(bugId) },
    { $pull: { testCases: { _id: new ObjectId(testId) } } }
  );
  return result;
}

// ==================== EDIT TRACKING FUNCTIONS ====================

/** Insert edit record for audit trail */
async function insertEdit(editRecord) {
  const db = await connectToDatabase();
  const result = await db.collection('edit').insertOne(editRecord);
  debugDb('Edit tracked:', editRecord);
  return result;
}

/** Optional: Get edit history for a specific resource */
async function getEditHistory(col, targetId) {
  const db = await connectToDatabase();
  const edits = await db.collection('edit')
    .find({ col, 'target.bugId': targetId })
    .sort({ timestamp: -1 })
    .toArray();
  return edits;
}

async function getClient() {
  if (!_client) {
    await connectToDatabase(); // This will create the client if it doesn't exist
  }
  return _client;
}

async function getDatabase() {
  return await connectToDatabase();
}

async function getDb() {
  return await connectToDatabase();
}

async function saveAuditLog(log) {
  const db = await connectToDatabase();
  const dbResult = await db.collection('AuditLog').insertOne(log);
  return dbResult;
}

async function getServices(filter = {}, sort = {}, limit = 0, skip = 0) {
  const db = await connectToDatabase();
  let query = db.collection('service').find(filter).sort(sort);

  if (skip > 0) {
    query = query.skip(skip);
  }
  if (limit > 0) {
    query = query.limit(limit);
  }

  return query.toArray();
}

async function getServiceById(serviceId) {
  const db = await connectToDatabase();
  const _id = typeof serviceId === 'string' ? new ObjectId(serviceId) : serviceId;
  return db.collection('service').findOne({ _id });
}

async function addService(service) {
  const db = await connectToDatabase();
  service._id = new ObjectId();
  return db.collection('service').insertOne(service);
}

async function updateService(serviceId, updatedService) {
  const db = await connectToDatabase();
  const _id = typeof serviceId === 'string' ? new ObjectId(serviceId) : serviceId;
  return db.collection('service').updateOne({ _id }, { $set: updatedService });
}

async function deleteService(serviceId) {
  const db = await connectToDatabase();
  const _id = typeof serviceId === 'string' ? new ObjectId(serviceId) : serviceId;
  return db.collection('service').deleteOne({ _id });
}

// Transaction database functions
export const getAllTransactions = async () => {
  const db = await connectToDatabase();
  return await db.collection('transaction').find({}).toArray();
};

export const getTransactionsByJobId = async (jobId) => {
  const db = await connectToDatabase();
  return await db.collection('transaction').find({
    jobId: new ObjectId(jobId)
  }).toArray();
};

export const getTransactionById = async (id) => {
  const db = await connectToDatabase();
  return await db.collection('transaction').findOne({
    _id: new ObjectId(id)
  });
};

export const createTransaction = async (transactionData) => {
  const db = await connectToDatabase();
  const result = await db.collection('transaction').insertOne(transactionData);
  return await db.collection('transaction').findOne({
    _id: result.insertedId
  });
};

export const updateTransactionStatus = async (id, status) => {
  const db = await connectToDatabase();
  const updateData = {
    status: status,
    updatedAt: new Date()
  };

  const result = await db.collection('transaction').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  return result;
};

// Job database functions
export const getAllJobs = async () => {
  const db = await connectToDatabase();
  return await db.collection('job').find({}).toArray();
};

export const getJobById = async (jobId) => {
  const db = await connectToDatabase();
  return await db.collection('job').findOne({
    _id: new ObjectId(jobId)
  });
};

export const createJob = async (jobData) => {
  const db = await connectToDatabase();
  const newJob = {
    customerId: jobData.customerId,
    providerId: jobData.providerId ? new ObjectId(jobData.providerId) : null,
    serviceIds: Array.isArray(jobData.serviceIds) ? jobData.serviceIds.map(id => new ObjectId(id)) : [],
    address: jobData.address,
    description: jobData.description,
    lotSquareFootage: jobData.lotSquareFootage,
    status: 'pending',
    type: jobData.type,
    scheduledDate: jobData.scheduledDate ? new Date(jobData.scheduledDate) : null,
    completedDate: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('job').insertOne(newJob);
  return await db.collection('job').findOne({ _id: result.insertedId });
};

export const updateJob = async (jobId, updateData) => {
  const db = await connectToDatabase();

  // Handle ObjectId conversions
  const processedData = {
    ...updateData,
    updatedAt: new Date()
  };

  if (processedData.customerId) processedData.customerId = new ObjectId(processedData.customerId);
  if (processedData.providerId) processedData.providerId = new ObjectId(processedData.providerId);
  // CHANGED: convert serviceIds array
  if (Array.isArray(processedData.serviceIds)) {
    processedData.serviceIds = processedData.serviceIds.map(id => new ObjectId(id));
  }
  if (processedData.scheduledDate) processedData.scheduledDate = new Date(processedData.scheduledDate);
  if (processedData.completedDate) processedData.completedDate = new Date(processedData.completedDate);

  const result = await db.collection('job').findOneAndUpdate(
    { _id: new ObjectId(jobId) },
    { $set: processedData },
    { returnDocument: 'after' }
  );

  return result;
};

export const deleteJob = async (jobId) => {
  const db = await connectToDatabase();
  return await db.collection('job').deleteOne({
    _id: new ObjectId(jobId)
  });
};

// Job Application database functions
export const getAllJobApplications = async () => {
  const db = await connectToDatabase();
  return await db.collection('jobApplication').find({}).toArray();
};

export const getJobApplicationsByJobId = async (jobId) => {
  const db = await connectToDatabase();
  return await db.collection('jobApplication').find({
    jobId: new ObjectId(jobId)
  }).toArray();
};

export const getJobApplicationById = async (id) => {
  const db = await connectToDatabase();
  return await db.collection('jobApplication').findOne({
    _id: new ObjectId(id)
  });
};

export const createJobApplication = async (applicationData) => {
  const db = await connectToDatabase();
  debugDb(`Creating job application with data: ${JSON.stringify(applicationData)}`);
  const result = await db.collection('jobApplication').insertOne(applicationData);
  return await db.collection('jobApplication').findOne({
    _id: result.insertedId
  });
};

export const updateJobApplication = async (id, updateData) => {
  const db = await connectToDatabase();
  const result = await db.collection('jobApplication').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  return result.value;
};

async function getServiceByProviderId(providerId, serviceType) {
  const db = await connectToDatabase();
  return await db.collection('services').findOne({
    providerId: new ObjectId(providerId),
    serviceType: serviceType
  });
}

/** Generate/Parse an ObjectId */
const newId = (str) => ObjectId.createFromHexString(str);

export {
  ping,
  connect,
  connectToDatabase,
  getClient,
  getDatabase,
  getDb,
  saveAuditLog,
  newId,
  // User functions - new names
  findAllUsers,
  findUserByEmail,
  findUserById,
  insertUser,
  updateUser,
  deleteUser,
  findUsersWithFilters,
  // User functions - legacy names
  getUsers,
  addUser,
  getUserByEmail,
  getUserById,
  // Bug functions
  findAllBugs,
  findBugById,
  insertBug,
  updateBug,
  deleteBug,
  findBugsWithFilters,
  // Comment functions
  addCommentToBug,
  // Test case functions
  addTestCaseToBug,
  updateTestCase,
  deleteTestCase,
  // Edit tracking functions
  insertEdit,
  getEditHistory,
  // Service functions
  getServices,
  getServiceById,
  addService,
  updateService,
  deleteService,
  getServiceByProviderId
};