import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import { isAuthenticated, hasPermission } from '../../middleware/auth.js';

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

// GET /api/bugs/:bugId/tests - Requires canViewData permission
router.get('/:bugId/tests', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugTest('GET /api/bugs/:bugId/tests');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    debugTest(`Found ${bug.testCases?.length || 0} test cases for bug ${bugId}`);
    res.json(bug.testCases || []);
  } catch (err) {
    debugTest('Error finding test cases:', err);
    next(err);
  }
});

// GET /api/bugs/:bugId/tests/:testId - Requires canViewData permission
router.get('/:bugId/tests/:testId', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugTest('GET /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const testCase = bug.testCases?.find(t => t._id.toString() === testId);
    
    if (!testCase) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    debugTest(`Test case found: ${testId}`);
    res.json(testCase);
  } catch (err) {
    debugTest('Error finding test case:', err);
    next(err);
  }
});

// POST /api/bugs/:bugId/tests - Requires canAddTestCase permission
router.post('/:bugId/tests', isAuthenticated, hasPermission('canAddTestCase'), async (req, res, next) => {
  try {
    debugTest('POST /api/bugs/:bugId/tests');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = createTestSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { testName, description, status } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const newTestCase = {
      _id: new ObjectId(),
      testName,
      description,
      status: status || 'pending',
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    await db.addTestCaseToBug(bugId, newTestCase);
    
    debugTest(`Test case added to bug ${bugId}`);
    res.status(200).json({ 
      message: 'Test case added successfully!', 
      testId: newTestCase._id.toString() 
    });
  } catch (err) {
    debugTest('Error adding test case:', err);
    next(err);
  }
});

// PATCH /api/bugs/:bugId/tests/:testId - Requires canEditTestCase permission
router.patch('/:bugId/tests/:testId', isAuthenticated, hasPermission('canEditTestCase'), async (req, res, next) => {
  try {
    debugTest('PATCH /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    const validateResult = updateTestSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { testName, description, status } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const testCaseIndex = bug.testCases?.findIndex(t => t._id.toString() === testId);
    
    if (testCaseIndex === -1 || testCaseIndex === undefined) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    const updates = {};
    if (testName !== undefined) updates.testName = testName;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    updates.lastUpdated = new Date();
    
    await db.updateTestCase(bugId, testId, updates);
    
    debugTest(`Test case ${testId} updated`);
    res.status(200).json({ 
      message: `Test case ${testId} updated!`, 
      testId 
    });
  } catch (err) {
    debugTest('Error updating test case:', err);
    next(err);
  }
});

// DELETE /api/bugs/:bugId/tests/:testId - Requires canDeleteTestCase permission
router.delete('/:bugId/tests/:testId', isAuthenticated, hasPermission('canDeleteTestCase'), async (req, res, next) => {
  try {
    debugTest('DELETE /api/bugs/:bugId/tests/:testId');
    const { bugId, testId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(testId)) {
      return res.status(400).json({ error: `testId ${testId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const testCaseIndex = bug.testCases?.findIndex(t => t._id.toString() === testId);
    
    if (testCaseIndex === -1 || testCaseIndex === undefined) {
      return res.status(404).json({ error: `Test case ${testId} not found.` });
    }
    
    await db.deleteTestCase(bugId, testId);
    
    debugTest(`Test case ${testId} deleted`);
    res.status(200).json({ 
      message: `Test case ${testId} deleted!`, 
      testId 
    });
  } catch (err) {
    debugTest('Error deleting test case:', err);
    next(err);
  }
});

export { router as testRouter };