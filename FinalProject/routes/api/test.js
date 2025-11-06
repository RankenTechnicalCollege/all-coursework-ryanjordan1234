import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';

const debugTest = debug('app:api:test');
const router = express.Router();

// Joi Schemas
const createTestSchema = Joi.object({
  testName: Joi.string().required(),
  description: Joi.string().required(),
  status: Joi.string().valid('passed', 'failed', 'pending').default('pending')
});

const updateTestSchema = Joi.object({
  testName: Joi.string().optional(),
  description: Joi.string().optional(),
  status: Joi.string().valid('passed', 'failed', 'pending').optional()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// GET /api/bugs/:bugId/tests
router.get('/:bugId/tests', async (req, res, next) => {
  try {
    debugTest('GET /api/bugs/:bugId/tests');
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    debugTest(`Found ${bug.testCases?.length || 0} test cases for bug ${bugId}`);
    res.json(bug.testCases || []);
  } catch (err) {
    debugTest('Error finding test cases:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bugs/:bugId/tests/:testId
router.get('/:bugId/tests/:testId', async (req, res, next) => {
  try {
    debugTest('GET /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find test case by ID
    const testCase = bug.testCases?.find(t => t._id.toString() === testId);
    
    if (!testCase) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    debugTest(`Test case found: ${testId}`);
    res.json(testCase);
  } catch (err) {
    debugTest('Error finding test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bugs/:bugId/tests
router.post('/:bugId/tests', async (req, res, next) => {
  try {
    debugTest('POST /api/bugs/:bugId/tests');
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = createTestSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { testName, description, status } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Create new test case
    const newTestCase = {
      _id: new ObjectId(),
      testName,
      description,
      status: status || 'pending',
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    // Add test case to bug's testCases array
    await db.addTestCaseToBug(bugId, newTestCase);
    
    debugTest(`Test case added to bug ${bugId}`);
    res.status(200).json({ 
      message: 'Test case added successfully!', 
      testId: newTestCase._id.toString() 
    });
  } catch (err) {
    debugTest('Error adding test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/bugs/:bugId/tests/:testId
router.patch('/:bugId/tests/:testId', async (req, res, next) => {
  try {
    debugTest('PATCH /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = updateTestSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { testName, description, status } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find test case by ID
    const testCaseIndex = bug.testCases?.findIndex(t => t._id.toString() === testId);
    
    if (testCaseIndex === -1 || testCaseIndex === undefined) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    // Build update object
    const updates = {};
    if (testName !== undefined) updates.testName = testName;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    updates.lastUpdated = new Date();
    
    // Update test case
    await db.updateTestCase(bugId, testId, updates);
    
    debugTest(`Test case ${testId} updated`);
    res.status(200).json({ 
      message: `Test case ${testId} updated!`, 
      testId 
    });
  } catch (err) {
    debugTest('Error updating test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/bugs/:bugId/tests/:testId
router.delete('/:bugId/tests/:testId', async (req, res, next) => {
  try {
    debugTest('DELETE /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find test case by ID
    const testCaseIndex = bug.testCases?.findIndex(t => t._id.toString() === testId);
    
    if (testCaseIndex === -1 || testCaseIndex === undefined) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    // Delete test case
    await db.deleteTestCase(bugId, testId);
    
    debugTest(`Test case ${testId} deleted`);
    res.status(200).json({ 
      message: `Test case ${testId} deleted!`, 
      testId 
    });
  } catch (err) {
    debugTest('Error deleting test case:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as testRouter };