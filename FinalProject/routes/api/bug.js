import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import { 
  isAuthenticated, 
  hasPermission, 
  canEditBug, 
  canReassignBug, 
  canClassifyBug 
} from '../../middleware/auth.js';

const debugBug = debug('app:api:bug');
const router = express.Router();

// Joi Schemas
const createBugSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  stepsToReproduce: Joi.string().optional()
});

const updateBugSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  stepsToReproduce: Joi.string().optional(),
  classification: Joi.string().valid('unclassified', 'approved', 'unapproved', 'duplicate').optional(),
  assignedTo: Joi.string().email().optional(),
  closed: Joi.boolean().optional()
});

const classifyBugSchema = Joi.object({
  classification: Joi.string().valid('unclassified', 'approved', 'unapproved', 'duplicate').required()
});

const assignBugSchema = Joi.object({
  assignedTo: Joi.string().email().required()
});

const closeBugSchema = Joi.object({
  closed: Joi.boolean().required()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

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

// GET /api/bugs - Requires canViewData permission
router.get('/', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugBug('GET /api/bugs');
    
    const { 
      keywords, 
      classification, 
      assignedTo,
      closed,
      maxAge, 
      minAge, 
      sortBy = 'newest', 
      pageSize = 10, 
      pageNumber = 1 
    } = req.query;
    
    const filter = {};
    
    if (keywords) {
      filter.$text = { $search: keywords };
    }
    
    if (classification) {
      filter.classification = classification;
    }
    
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    
    if (closed !== undefined) {
      filter.closed = closed === 'true';
    }
    
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
        sort = { assignedTo: 1, createdOn: -1 };
        break;
      default:
        sort = { createdOn: -1 };
    }
    
    const limit = parseInt(pageSize);
    const skip = (parseInt(pageNumber) - 1) * limit;
    
    const bugs = await db.findBugsWithFilters(filter, sort, skip, limit);
    res.json(bugs);
  } catch (err) {
    debugBug('Error finding bugs:', err);
    next(err);
  }
});

// GET /api/bugs/:bugId - Requires canViewData permission
router.get('/:bugId', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
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

// POST /api/bugs - Requires canCreateBug permission
router.post('/', isAuthenticated, hasPermission('canCreateBug'), async (req, res, next) => {
  try {
    debugBug('POST /api/bugs');
    
    const validateResult = createBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    // Bugs are unclassified initially and assigned to the author
    const newBug = {
      title,
      description,
      stepsToReproduce: stepsToReproduce || '',
      classification: 'unclassified',
      author: req.user.email,
      assignedTo: req.user.email, // Assigned to author initially
      closed: false,
      createdOn: new Date(),
      createdBy: { email: req.user.email, fullName: req.user.fullName },
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName },
      comments: [],
      testCases: []
    };
    
    const result = await db.insertBug(newBug);
    const bugId = result.insertedId.toString();
    
    await trackEdit(
      'bug',
      'create',
      { bugId },
      newBug,
      req.user.email
    );
    
    debugBug(`Bug created: ${bugId}`);
    res.status(201).json({ 
      message: 'Bug created successfully!', 
      bugId 
    });
  } catch (err) {
    debugBug('Error creating bug:', err);
    next(err);
  }
});

// PATCH /api/bugs/:bugId - Complex authorization (canEditAnyBug OR canEditMyBug OR canEditIfAssignedTo)
router.patch('/:bugId', isAuthenticated, canEditBug, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = updateBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { title, description, stepsToReproduce } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const updates = {
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
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
    
    if (Object.keys(changedFields).length > 0) {
      await db.updateBug(bugId, updates);
      
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

// PATCH /api/bugs/:bugId/classify - Complex authorization
router.patch('/:bugId/classify', isAuthenticated, canClassifyBug, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/classify');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = classifyBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { classification } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const updates = {
      classification,
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
    };
    
    await db.updateBug(bugId, updates);
    
    await trackEdit(
      'bug',
      'classify',
      { bugId },
      { classification },
      req.user.email
    );
    
    debugBug(`Bug ${bugId} classified as: ${classification}`);
    res.status(200).json({ 
      message: `Bug ${bugId} classified as ${classification}!`, 
      bugId 
    });
  } catch (err) {
    debugBug('Error classifying bug:', err);
    next(err);
  }
});

// PATCH /api/bugs/:bugId/assign - Complex authorization
router.patch('/:bugId/assign', isAuthenticated, canReassignBug, async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/assign');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = assignBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { assignedTo } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Verify the user being assigned exists and has appropriate role
    const assignee = await db.findUserByEmail(assignedTo);
    if (!assignee) {
      return res.status(400).json({ 
        error: `User ${assignedTo} not found.` 
      });
    }
    
    // Check if assignee has canBeAssignedTo permission
    const db_instance = await db.getDb();
    const assigneeRoles = Array.isArray(assignee.role) ? assignee.role : [assignee.role];
    const roleDocuments = await db_instance.collection('role')
      .find({ name: { $in: assigneeRoles } })
      .toArray();
    
    const hasAssignPermission = roleDocuments.some(roleDoc => 
      roleDoc.permissions && roleDoc.permissions.includes('canBeAssignedTo')
    );
    
    if (!hasAssignPermission) {
      return res.status(400).json({ 
        error: `User ${assignedTo} cannot be assigned bugs (must be Developer, Business Analyst, or Quality Analyst).` 
      });
    }
    
    const updates = {
      assignedTo,
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
    };
    
    await db.updateBug(bugId, updates);
    
    await trackEdit(
      'bug',
      'assign',
      { bugId },
      { assignedTo },
      req.user.email
    );
    
    debugBug(`Bug ${bugId} assigned to: ${assignedTo}`);
    res.status(200).json({ 
      message: `Bug ${bugId} assigned to ${assignedTo}!`, 
      bugId 
    });
  } catch (err) {
    debugBug('Error assigning bug:', err);
    next(err);
  }
});

// PATCH /api/bugs/:bugId/close - Requires canCloseAnyBug permission
router.patch('/:bugId/close', isAuthenticated, hasPermission('canCloseAnyBug'), async (req, res, next) => {
  try {
    debugBug('PATCH /api/bugs/:bugId/close');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = closeBugSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { closed } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const updates = {
      closed,
      lastUpdatedOn: new Date(),
      lastUpdatedBy: { email: req.user.email, fullName: req.user.fullName }
    };
    
    await db.updateBug(bugId, updates);
    
    await trackEdit(
      'bug',
      closed ? 'close' : 'reopen',
      { bugId },
      { closed },
      req.user.email
    );
    
    debugBug(`Bug ${bugId} ${closed ? 'closed' : 'reopened'}`);
    res.status(200).json({ 
      message: `Bug ${bugId} ${closed ? 'closed' : 'reopened'}!`, 
      bugId 
    });
  } catch (err) {
    debugBug('Error closing/reopening bug:', err);
    next(err);
  }
});

export { router as bugRouter };