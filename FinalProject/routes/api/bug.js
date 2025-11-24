import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import { requireAuth } from '../../middleware/auth.js';

const debugBug = debug('app:api:bug');
const router = express.Router();

// Helper function to track edits
const trackEdit = async (col, op, target, update, performedBy) => {
  const editRecord = {
    timestamp: new Date(),
    col,
    op,
    target,
    update,
    performedBy
  };
  await db.insertEdit(editRecord);
};

// Joi Schemas
const createBugSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  stepsToReproduce: Joi.string().required()
});

const updateBugSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  stepsToReproduce: Joi.string().optional()
});

const classifySchema = Joi.object({
  classification: Joi.string().valid('approved', 'unapproved', 'duplicate', 'unclassified').required()
});

const assignSchema = Joi.object({
  assignedToUserId: Joi.string().required()
});

const closeSchema = Joi.object({
  closed: Joi.boolean().required()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// ============================================================
// GET /api/bugs - WITH SEARCH FUNCTIONALITY (EXERCISE 2)
// ============================================================
router.get('/', requireAuth, async (req, res, next) => {
  try {
    debugBug('GET /api/bugs');
    
    // Extract query parameters with defaults
    const { 
      keywords,
      classification,
      maxAge,
      minAge,
      closed,
      sortBy = 'newest',
      pageSize = 5,
      pageNumber = 1
    } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    if (classification) {
      filter.classification = classification;
    }
    
    // Age filters
    if (maxAge || minAge) {
      filter.createdOn = {};
      
      if (maxAge) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - parseInt(maxAge));
        filter.createdOn.$gte = maxDate;
      }
      
      if (minAge) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - parseInt(minAge));
        filter.createdOn.$lt = minDate;
      }
    }
    
    // Closed filter
    if (closed !== undefined && closed !== null && closed !== '') {
      filter.closed = closed === 'true' || closed === true;
    }
    
    // Build sort options
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdOn: -1 };
        break;
      case 'oldest':
        sort = { createdOn: 1 };
        break;
      case 'title':
        sort = { title: 1, createdOn: -1 };
        break;
      case 'classification':
        sort = { classification: 1, createdOn: -1 };
        break;
      case 'assignedTo':
        sort = { 'assignedTo.fullName': 1, createdOn: -1 };
        break;
      case 'createdBy':
        sort = { 'createdBy.fullName': 1, createdOn: -1 };
        break;
      default:
        sort = { createdOn: -1 };
    }
    
    // Pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    const bugs = await db.findBugsWithFilters(filter, sort, skip, limit);
    res.json(bugs);
  } catch (err) {
    debugBug('Error finding bugs:', err);
    next(err);
  }
});

// ============================================================
// GET /api/bugs/:bugId - Get single bug by ID
// ============================================================
router.get('/:bugId', requireAuth, async (req, res, next) => {
  try {
    debugBug('GET /api/bugs/:bugId');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    debugBug(`Bug found: ${bugId}`);
    res.json(bug);
  } catch (err) {
    debugBug('Error finding bug:', err);
    next(err);
  }
});

// ============================================================
// POST /api/bugs - Create a new bug
// ============================================================
router.post('/', requireAuth, async (req, res, next) => {
  try {
    debugBug('POST /api/bugs');
    
    // Validate request body
    const validateResult = createBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    // Create new bug with authenticated user data
    const newBug = {
      title,
      description,
      stepsToReproduce,
      createdOn: new Date(),
      createdBy: {
        userId: req.user.userId,
        email: req.user.email,
        fullName: req.user.fullName
      },
      classification: 'unclassified',
      closed: false,
      classifiedOn: null,
      classifiedBy: null,
      assignedTo: null,
      assignedOn: null,
      assignedBy: null,
      closedOn: null,
      closedBy: null,
      lastUpdatedOn: new Date(),
      lastUpdatedBy: {
        email: req.user.email,
        fullName: req.user.fullName
      }
    };
    
    const result = await db.insertBug(newBug);
    const bugId = result.insertedId.toString();
    
    // Track the edit
    await trackEdit(
      'bug',
      'insert',
      { bugId },
      newBug,
      req.user.email
    );
    
    debugBug(`Bug created: ${bugId}`);
    res.status(200).json({ message: 'New bug reported!', bugId });
  } catch (err) {
    debugBug('Error creating bug:', err);
    next(err);
  }
});

// ============================================================
// PATCH /api/bugs/:bugId - Update bug title/description/steps
// ============================================================
router.patch('/:bugId', requireAuth, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId');
    
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body
    const validateResult = updateBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Build update object
    const updates = {
      lastUpdatedOn: new Date(),
      lastUpdatedBy: {
        email: req.user.email,
        fullName: req.user.fullName
      }
    };
    
    const changedFields = {};
    
    if (title !== undefined) {
      updates.title = title;
      changedFields.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
      changedFields.description = description;
    }
    if (stepsToReproduce !== undefined) {
      updates.stepsToReproduce = stepsToReproduce;
      changedFields.stepsToReproduce = stepsToReproduce;
    }
    
    // Only update if there are changes
    if (Object.keys(changedFields).length > 0) {
      await db.updateBug(bugId, updates);
      
      // Track the edit
      await trackEdit(
        'bug',
        'update',
        { bugId },
        changedFields,
        req.user.email
      );
    }
    
    debugBug(`Bug updated: ${bugId}`);
    res.status(200).json({ message: `Bug ${bugId} updated!`, bugId });
  } catch (err) {
    debugBug('Error updating bug:', err);
    next(err);
  }
});

// ============================================================
// PATCH /api/bugs/:bugId/classify - Set bug classification
// ============================================================
router.patch('/:bugId/classify', requireAuth, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/classify');
    
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body
    const validateResult = classifySchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { classification } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Update classification fields
    const updates = {
      classification,
      classifiedOn: new Date(),
      classifiedBy: {
        userId: req.user.userId,
        email: req.user.email,
        fullName: req.user.fullName
      },
      lastUpdatedOn: new Date(),
      lastUpdatedBy: {
        email: req.user.email,
        fullName: req.user.fullName
      }
    };
    
    await db.updateBug(bugId, updates);
    
    // Track the edit
    await trackEdit(
      'bug',
      'update',
      { bugId },
      { classification },
      req.user.email
    );
    
    debugBug(`Bug classified: ${bugId}`);
    res.status(200).json({ message: `Bug ${bugId} classified!`, bugId });
  } catch (err) {
    debugBug('Error classifying bug:', err);
    next(err);
  }
});

// ============================================================
// PATCH /api/bugs/:bugId/assign - Assign bug to a user
// ============================================================
router.patch('/:bugId/assign', requireAuth, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/assign');
    
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body
    const validateResult = assignSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { assignedToUserId } = req.body;
    
    if (!isValidObjectId(assignedToUserId)) {
      return res.status(400).json({ error: `assignedToUserId ${assignedToUserId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find user to get their info
    const user = await db.findUserById(assignedToUserId);
    
    if (!user) {
      return res.status(400).json({ error: 'Assigned user not found.' });
    }
    
    // Update assignment fields
    const updates = {
      assignedTo: {
        userId: assignedToUserId,
        email: user.email,
        fullName: user.fullName
      },
      assignedOn: new Date(),
      assignedBy: {
        userId: req.user.userId,
        email: req.user.email,
        fullName: req.user.fullName
      },
      lastUpdatedOn: new Date(),
      lastUpdatedBy: {
        email: req.user.email,
        fullName: req.user.fullName
      }
    };
    
    await db.updateBug(bugId, updates);
    
    // Track the edit
    await trackEdit(
      'bug',
      'update',
      { bugId },
      { assignedTo: user.fullName },
      req.user.email
    );
    
    debugBug(`Bug assigned: ${bugId} to ${user.fullName}`);
    res.status(200).json({ message: `Bug ${bugId} assigned!`, bugId });
  } catch (err) {
    debugBug('Error assigning bug:', err);
    next(err);
  }
});

// ============================================================
// PATCH /api/bugs/:bugId/close - Close or reopen a bug
// ============================================================
router.patch('/:bugId/close', requireAuth, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/close');
    
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body
    const validateResult = closeSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { closed } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Update closed fields
    const updates = {
      closed,
      closedOn: closed ? new Date() : null,
      closedBy: closed ? {
        userId: req.user.userId,
        email: req.user.email,
        fullName: req.user.fullName
      } : null,
      lastUpdatedOn: new Date(),
      lastUpdatedBy: {
        email: req.user.email,
        fullName: req.user.fullName
      }
    };
    
    await db.updateBug(bugId, updates);
    
    // Track the edit
    await trackEdit(
      'bug',
      'update',
      { bugId },
      { closed },
      req.user.email
    );
    
    debugBug(`Bug ${closed ? 'closed' : 'reopened'}: ${bugId}`);
    res.status(200).json({ message: `Bug ${bugId} ${closed ? 'closed' : 'reopened'}!`, bugId });
  } catch (err) {
    debugBug('Error closing bug:', err);
    next(err);
  }
});

// ============================================================
// DELETE /api/bugs/:bugId - Delete a bug
// ============================================================
router.delete('/:bugId', requireAuth, async (req, res, next) => {
  try {
    debugBug('DELETE /api/bugs/:bugId');
    
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Track the delete before actually deleting
    await trackEdit(
      'bug',
      'delete',
      { bugId },
      {},
      req.user.email
    );
    
    await db.deleteBug(bugId);
    
    debugBug(`Bug deleted: ${bugId}`);
    res.status(200).json({ message: `Bug ${bugId} deleted!`, bugId });
  } catch (err) {
    debugBug('Error deleting bug:', err);
    next(err);
  }
});

export { router as bugRouter };