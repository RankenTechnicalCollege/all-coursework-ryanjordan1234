import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';

const debugBug = debug('app:api:bug');
const router = express.Router();

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
router.get('/', async (req, res, next) => {
  try {
    debugBug('GET /api/bugs');
    
    // Extract query parameters with defaults
    const { 
      keywords,           // Optional: text search
      classification,     // Optional: filter by classification
      maxAge,            // Optional: days since creation (show newer)
      minAge,            // Optional: days since creation (show older)
      closed,            // Optional: filter by closed status
      sortBy = 'newest', // Default sort
      pageSize = 5,      // Default page size
      pageNumber = 1     // Default page number
    } = req.query;
    
    // Build query filter
    const filter = {};
    
    // TEXT SEARCH: Use $text operator if keywords provided
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    // CLASSIFICATION FILTER: Only if classification is provided
    if (classification) {
      filter.classification = classification;
    }
    
    // AGE FILTERS: Days since creation
    if (maxAge || minAge) {
      filter.createdAt = {};
      
      if (maxAge) {
        // maxAge: show bugs created AFTER this date (newer than maxAge days)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() - parseInt(maxAge));
        filter.createdAt.$gte = maxDate;
      }
      
      if (minAge) {
        // minAge: show bugs created BEFORE this date (older than minAge days)
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - parseInt(minAge));
        filter.createdAt.$lt = minDate;
      }
    }
    
    // CLOSED FILTER: Handle as boolean
    // Default: show all bugs (no filter)
    // closed=true: show only closed bugs
    // closed=false: show only open bugs
    if (closed !== undefined && closed !== null && closed !== '') {
      // Convert string "true"/"false" to boolean
      filter.closed = closed === 'true' || closed === true;
    }
    
    // BUILD SORT OPTIONS based on sortBy parameter
    let sort = {};
    switch (sortBy) {
      case 'newest':
        // created date descending (newest first)
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        // created date ascending (oldest first)
        sort = { createdAt: 1 };
        break;
      case 'title':
        // title ascending, created date descending (for stability)
        sort = { title: 1, createdAt: -1 };
        break;
      case 'classification':
        // classification ascending, created date descending (for stability)
        sort = { classification: 1, createdAt: -1 };
        break;
      case 'assignedTo':
        // assigned to name ascending, created date descending (for stability)
        sort = { assignedToUserName: 1, createdAt: -1 };
        break;
      case 'createdBy':
        // created by name ascending, created date descending (for stability)
        sort = { author: 1, createdAt: -1 };
        break;
      default:
        // Default to newest
        sort = { createdAt: -1 };
    }
    
    // PAGINATION CALCULATIONS
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    debugBug('Filter:', filter);
    debugBug('Sort:', sort);
    debugBug('Pagination:', { skip, limit });
    
    // Query database with filters, sorting, and pagination
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
router.get('/:bugId', async (req, res, next) => {
  try {
    debugBug('GET /api/bugs/:bugId');
    const { bugId } = req.params;
    
    // Validate ObjectId
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
router.post('/', async (req, res, next) => {
  try {
    debugBug('POST /api/bugs');
    
    // Validate request body with Joi
    const validateResult = createBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    // Create new bug with all required fields
    const newBug = {
      title,
      description,
      stepsToReproduce,
      author: null, // Will be set from authenticated user in Phase 5
      createdAt: new Date(),
      lastUpdated: new Date(),
      classification: 'unclassified',
      classifiedOn: null,
      classifiedBy: null,
      assignedToUserId: null,
      assignedToUserName: null,
      assignedOn: null,
      closed: false,
      closedOn: null,
      closedBy: null,
      comments: [],
      testCases: [],
      hoursWorked: [],
      fixedOn: null,
      releaseVersion: null
    };
    
    const result = await db.insertBug(newBug);
    const bugId = result.insertedId.toString();
    
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
router.patch('/:bugId', async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId');
    
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = updateBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Build update object with only provided fields
    const updates = {
      lastUpdated: new Date()
    };
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (stepsToReproduce !== undefined) updates.stepsToReproduce = stepsToReproduce;
    
    await db.updateBug(bugId, updates);
    
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
router.patch('/:bugId/classify', async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/classify');
    
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = classifySchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { classification } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Update classification fields
    const updates = {
      classification,
      classifiedOn: new Date(),
      lastUpdated: new Date()
    };
    
    await db.updateBug(bugId, updates);
    
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
router.patch('/:bugId/assign', async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/assign');
    
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = assignSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { assignedToUserId } = req.body;
    
    // Validate assigned user ObjectId
    if (!isValidObjectId(assignedToUserId)) {
      return res.status(400).json({ error: `assignedToUserId ${assignedToUserId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find user by ID to get their name
    const user = await db.findUserById(assignedToUserId);
    
    if (!user) {
      return res.status(400).json({ error: 'Assigned user not found.' });
    }
    
    // Update assignment fields
    const updates = {
      assignedToUserId,
      assignedToUserName: user.fullName,
      assignedOn: new Date(),
      lastUpdated: new Date()
    };
    
    await db.updateBug(bugId, updates);
    
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
router.patch('/:bugId/close', async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/close');
    
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = closeSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { closed } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Update closed fields
    const updates = {
      closed,
      closedOn: closed ? new Date() : null,
      lastUpdated: new Date()
    };
    
    await db.updateBug(bugId, updates);
    
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
router.delete('/:bugId', async (req, res, next) => {
  try {
    debugBug('DELETE /api/bugs/:bugId');
    
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID first to check if it exists
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Delete the bug
    await db.deleteBug(bugId);
    
    debugBug(`Bug deleted: ${bugId}`);
    res.status(200).json({ message: `Bug ${bugId} deleted!`, bugId });
  } catch (err) {
    debugBug('Error deleting bug:', err);
    next(err);
  }
});

export { router as bugRouter };