import express from 'express';
import {
  findBugById,
  addTestCaseToBug,
  updateTestCase,
  deleteTestCase
} from '../../database.js';
import debug from 'debug';
const debugTests = debug('app:tests');
import { ObjectId } from 'mongodb';
import { isAuthenticated } from '../../middleware/isAuthenticated.js';
import { hasPermission } from '../../middleware/hasPermissions.js';

const router = express.Router();

// GET all test cases for a bug
router.get('/:bugId/tests', isAuthenticated, hasPermission('canViewData'), async (req, res) => {
  const { bugId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  const bug = await findBugById(bugId);

  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  // Return test cases array (or empty array if no tests)
  const testCases = bug.testCases || [];
  debugTests(`Retrieved ${testCases.length} test cases for bug ${bugId}`);
  res.status(200).json(testCases);
});

// GET a specific test case
router.get('/:bugId/tests/:testId', isAuthenticated, hasPermission('canViewData'), async (req, res) => {
  const { bugId, testId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ message: 'Invalid test ID' });
  }

  const bug = await findBugById(bugId);

  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  // Find the specific test case
  const testCase = bug.testCases?.find(t => t._id.toString() === testId);

  if (!testCase) {
    return res.status(404).json({ message: 'Test case not found' });
  }

  debugTests(`Retrieved test case ${testId} for bug ${bugId}`);
  res.status(200).json(testCase);
});

// POST - Add a test case to a bug
router.post('/:bugId/tests', isAuthenticated, hasPermission('canCreateTest'), async (req, res) => {
  const { bugId } = req.params;
  const { title, description, steps, expectedResult, actualResult, status } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Test title is required' });
  }

  // Create new test case object
  const newTestCase = {
    _id: new ObjectId(),
    title: title.trim(),
    description: description || '',
    steps: steps || [],
    expectedResult: expectedResult || '',
    actualResult: actualResult || '',
    status: status || 'pending', // pending, passed, failed
    createdAt: new Date(),
    createdBy: {
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName
    }
  };

  // Check if bug exists
  const bug = await findBugById(bugId);
  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  // Add test case to bug
  const result = await addTestCaseToBug(bugId, newTestCase);

  if (result.modifiedCount === 1) {
    debugTests(`Test case added to bug ${bugId} by ${req.user.email}`);
    res.status(201).json({
      message: 'Test case added successfully',
      testCase: newTestCase
    });
  } else {
    res.status(500).json({ message: 'Error adding test case' });
  }
});

// PUT - Update a test case (full update)
router.put('/:bugId/tests/:testId', isAuthenticated, hasPermission('canEditTest'), async (req, res) => {
  const { bugId, testId } = req.params;
  const updates = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ message: 'Invalid test ID' });
  }

  // Add update metadata
  updates.lastUpdatedOn = new Date();
  updates.lastUpdatedBy = {
    userId: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName
  };

  // Check if bug and test exist
  const bug = await findBugById(bugId);
  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  const testExists = bug.testCases?.some(t => t._id.toString() === testId);
  if (!testExists) {
    return res.status(404).json({ message: 'Test case not found' });
  }

  // Update test case
  const result = await updateTestCase(bugId, testId, updates);

  if (result.modifiedCount === 1) {
    debugTests(`Test case ${testId} updated in bug ${bugId}`);
    res.status(200).json({ message: 'Test case updated successfully' });
  } else {
    res.status(500).json({ message: 'Error updating test case' });
  }
});

// PATCH - Update a test case (partial update)
router.patch('/:bugId/tests/:testId', isAuthenticated, hasPermission('canEditTest'), async (req, res) => {
  const { bugId, testId } = req.params;
  const updates = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ message: 'Invalid test ID' });
  }

  // Add update metadata
  updates.lastUpdatedOn = new Date();
  updates.lastUpdatedBy = {
    userId: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName
  };

  // Check if bug and test exist
  const bug = await findBugById(bugId);
  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  const testExists = bug.testCases?.some(t => t._id.toString() === testId);
  if (!testExists) {
    return res.status(404).json({ message: 'Test case not found' });
  }

  // Update test case
  const result = await updateTestCase(bugId, testId, updates);

  if (result.modifiedCount === 1) {
    debugTests(`Test case ${testId} patched in bug ${bugId}`);
    res.status(200).json({ message: 'Test case updated successfully' });
  } else {
    res.status(500).json({ message: 'Error updating test case' });
  }
});

// PATCH - Update test case status only
router.patch('/:bugId/tests/:testId/status', isAuthenticated, hasPermission('canEditTest'), async (req, res) => {
  const { bugId, testId } = req.params;
  const { status } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ message: 'Invalid test ID' });
  }

  if (!status || !['pending', 'passed', 'failed'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required (pending, passed, failed)' });
  }

  const updates = {
    status,
    lastUpdatedOn: new Date(),
    lastUpdatedBy: {
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName
    }
  };

  const bug = await findBugById(bugId);
  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  const testExists = bug.testCases?.some(t => t._id.toString() === testId);
  if (!testExists) {
    return res.status(404).json({ message: 'Test case not found' });
  }

  const result = await updateTestCase(bugId, testId, updates);

  if (result.modifiedCount === 1) {
    debugTests(`Test case ${testId} status updated to ${status}`);
    res.status(200).json({ message: 'Test case status updated successfully' });
  } else {
    res.status(500).json({ message: 'Error updating test case status' });
  }
});

// DELETE - Delete a test case
router.delete('/:bugId/tests/:testId', isAuthenticated, hasPermission('canDeleteTest'), async (req, res) => {
  const { bugId, testId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ message: 'Invalid test ID' });
  }

  const bug = await findBugById(bugId);

  if (!bug) {
    return res.status(404).json({ message: 'Bug not found' });
  }

  const testExists = bug.testCases?.some(t => t._id.toString() === testId);
  if (!testExists) {
    return res.status(404).json({ message: 'Test case not found' });
  }

  // Delete test case
  const result = await deleteTestCase(bugId, testId);

  if (result.modifiedCount === 1) {
    debugTests(`Test case ${testId} deleted from bug ${bugId}`);
    res.status(200).json({ message: 'Test case deleted successfully' });
  } else {
    res.status(500).json({ message: 'Error deleting test case' });
  }
});

export { router as testRouter };