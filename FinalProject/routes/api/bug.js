import express from 'express';
import { 
  findAllBugs,          // NOT getBugs
  findBugById,          // NOT getBugById
  findBugsWithFilters,  // For filtering/pagination
  insertBug,            // NOT addBug
  updateBug,            // ✅ Correct
  deleteBug             // ✅ Correct
} from '../../database.js';
import debug from 'debug';
import { ObjectId } from 'mongodb';
import { 
  isAuthenticated,      // ← Authentication check
  hasPermission,        // ← Permission check (e.g., 'canViewData')
  canEditBug,          // ← Bug-specific edit permission
  canReassignBug,      // ← Bug-specific reassign permission
  canClassifyBug       // ← Bug-specific classify permission
} from '../../middleware/auth.js';

const debugBugs = debug('app:bugs');
const router = express.Router();

// GET all bugs with filtering, sorting, and pagination
router.get('', isAuthenticated, hasPermission('canViewData'), async (req, res) => {
  const { keywords, classification, minSeverity, maxSeverity, status, assignedTo, author, page, limit, sortBy } = req.query;

  // Handle pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 0;
  const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

  // Build filter
  const filter = {};

  if (keywords) filter.$text = { $search: keywords };
  if (classification) filter.classification = classification;
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (author) filter.author = author;

  // Handle severity filtering
  if (minSeverity || maxSeverity) {
    const severityFilter = {};
    if (minSeverity) severityFilter.$gte = parseInt(minSeverity);
    if (maxSeverity) severityFilter.$lte = parseInt(maxSeverity);
    filter.severity = severityFilter;
  }

  // Sorting
  const sortOptions = {
    title: { title: 1 },
    severity: { severity: -1 },
    createdAt: { createdAt: -1 },
    status: { status: 1 }
  };
  const sort = sortOptions[sortBy] || { createdAt: -1 };

  debugBugs(`Finding bugs with filter: ${JSON.stringify(filter)}, sort: ${JSON.stringify(sort)}`);

  try {
    const bugs = await findBugsWithFilters(filter, sort, skip, limitNum);
    res.status(200).json(bugs);
  } catch (err) {
    debugBugs(`Error fetching bugs: ${err}`);
    res.status(500).json({ message: 'Error retrieving bugs' });
  }
});

// GET bug by ID
router.get('/:bugId', isAuthenticated, hasPermission('canViewData'), async (req, res) => {
  const { bugId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  try {
    const bug = await findBugById(bugId);
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }
    res.status(200).json(bug);
  } catch (err) {
    debugBugs(`Error fetching bug: ${err}`);
    res.status(500).json({ message: 'Error retrieving bug' });
  }
});

// POST - Create new bug
router.post('', isAuthenticated, hasPermission('canCreateBug'), async (req, res) => {
  const newBug = req.body;

  // Add metadata
  newBug.author = req.user.email;
  newBug.createdAt = new Date();
  newBug.createdBy = {
    userId: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName
  };

  // Initialize arrays
  newBug.comments = newBug.comments || [];
  newBug.testCases = newBug.testCases || [];

  try {
    const result = await insertBug(newBug);
    if (result.insertedId) {
      debugBugs(`Bug created: ${result.insertedId}`);
      res.status(201).json({ ...newBug, _id: result.insertedId });
    } else {
      res.status(500).json({ message: 'Error creating bug' });
    }
  } catch (err) {
    debugBugs(`Error creating bug: ${err}`);
    res.status(500).json({ message: 'Error creating bug' });
  }
});

// PUT - Update bug (full update)
router.put('/:bugId', isAuthenticated, canEditBug, async (req, res) => {
  const { bugId } = req.params;
  const updates = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  // Add update metadata
  updates.lastUpdatedOn = new Date();
  updates.lastUpdatedBy = {
    userId: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName
  };

  try {
    const result = await updateBug(bugId, updates);
    if (result.modifiedCount === 1) {
      debugBugs(`Bug updated: ${bugId}`);
      res.status(200).json({ message: 'Bug updated successfully' });
    } else {
      res.status(404).json({ message: 'Bug not found or not updated' });
    }
  } catch (err) {
    debugBugs(`Error updating bug: ${err}`);
    res.status(500).json({ message: 'Error updating bug' });
  }
});

// PATCH - Partial update bug
router.patch('/:bugId', isAuthenticated, canEditBug, async (req, res) => {
  const { bugId } = req.params;
  const updates = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  // Add update metadata
  updates.lastUpdatedOn = new Date();
  updates.lastUpdatedBy = {
    userId: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName
  };

  try {
    const result = await updateBug(bugId, updates);
    if (result.modifiedCount === 1) {
      debugBugs(`Bug patched: ${bugId}`);
      res.status(200).json({ message: 'Bug updated successfully' });
    } else {
      res.status(404).json({ message: 'Bug not found or not updated' });
    }
  } catch (err) {
    debugBugs(`Error patching bug: ${err}`);
    res.status(500).json({ message: 'Error updating bug' });
  }
});

// PATCH - Reassign bug
router.patch('/:bugId/reassign', isAuthenticated, canReassignBug, async (req, res) => {
  const { bugId } = req.params;
  const { assignedTo } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!assignedTo) {
    return res.status(400).json({ message: 'assignedTo is required' });
  }

  const updates = {
    assignedTo,
    lastUpdatedOn: new Date(),
    lastUpdatedBy: {
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName
    }
  };

  try {
    const result = await updateBug(bugId, updates);
    if (result.modifiedCount === 1) {
      debugBugs(`Bug reassigned: ${bugId} to ${assignedTo}`);
      res.status(200).json({ message: 'Bug reassigned successfully' });
    } else {
      res.status(404).json({ message: 'Bug not found or not updated' });
    }
  } catch (err) {
    debugBugs(`Error reassigning bug: ${err}`);
    res.status(500).json({ message: 'Error reassigning bug' });
  }
});

// PATCH - Classify bug
router.patch('/:bugId/classify', isAuthenticated, canClassifyBug, async (req, res) => {
  const { bugId } = req.params;
  const { classification, severity } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  const updates = {
    lastUpdatedOn: new Date(),
    lastUpdatedBy: {
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName
    }
  };

  if (classification) updates.classification = classification;
  if (severity !== undefined) updates.severity = severity;

  try {
    const result = await updateBug(bugId, updates);
    if (result.modifiedCount === 1) {
      debugBugs(`Bug classified: ${bugId}`);
      res.status(200).json({ message: 'Bug classified successfully' });
    } else {
      res.status(404).json({ message: 'Bug not found or not updated' });
    }
  } catch (err) {
    debugBugs(`Error classifying bug: ${err}`);
    res.status(500).json({ message: 'Error classifying bug' });
  }
});

// DELETE - Delete bug
router.delete('/:bugId', isAuthenticated, hasPermission('canDeleteBug'), async (req, res) => {
  const { bugId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  try {
    const result = await deleteBug(bugId);
    if (result.deletedCount === 1) {
      debugBugs(`Bug deleted: ${bugId}`);
      res.status(200).json({ message: 'Bug deleted successfully' });
    } else {
      res.status(404).json({ message: 'Bug not found' });
    }
  } catch (err) {
    debugBugs(`Error deleting bug: ${err}`);
    res.status(500).json({ message: 'Error deleting bug' });
  }
});

export { router as bugRouter };