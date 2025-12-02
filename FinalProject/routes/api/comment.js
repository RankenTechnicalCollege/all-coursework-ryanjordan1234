import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';
import { isAuthenticated, hasPermission } from '../../middleware/auth.js';

const debugComment = debug('app:api:comment');
const router = express.Router();

// Joi Schema for creating a comment
const createCommentSchema = Joi.object({
  author: Joi.string().required(),
  comment: Joi.string().required()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// GET /api/bugs/:bugId/comments - Requires canViewData permission
router.get('/:bugId/comments', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugComment('GET /api/bugs/:bugId/comments');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    debugComment(`Found ${bug.comments?.length || 0} comments for bug ${bugId}`);
    res.json(bug.comments || []);
  } catch (err) {
    debugComment('Error finding comments:', err);
    next(err);
  }
});

// GET /api/bugs/:bugId/comments/:commentId - Requires canViewData permission
router.get('/:bugId/comments/:commentId', isAuthenticated, hasPermission('canViewData'), async (req, res, next) => {
  try {
    debugComment('GET /api/bugs/:bugId/comments/:commentId');
    const { bugId, commentId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: `commentId ${commentId} is not a valid ObjectId.` });
    }
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const comment = bug.comments?.find(c => c._id.toString() === commentId);
    
    if (!comment) {
      return res.status(404).json({ error: `Comment ${commentId} not found.` });
    }
    
    debugComment(`Comment found: ${commentId}`);
    res.json(comment);
  } catch (err) {
    debugComment('Error finding comment:', err);
    next(err);
  }
});

// POST /api/bugs/:bugId/comments - Requires canAddComment permission
router.post('/:bugId/comments', isAuthenticated, hasPermission('canAddComment'), async (req, res, next) => {
  try {
    debugComment('POST /api/bugs/:bugId/comments');
    const { bugId } = req.params;
    
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    const validateResult = createCommentSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error.details[0].message });
    }
    
    const { author, comment } = req.body;
    
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    const newComment = {
      _id: new ObjectId(),
      author,
      comment,
      createdAt: new Date()
    };
    
    await db.addCommentToBug(bugId, newComment);
    
    debugComment(`Comment added to bug ${bugId}`);
    res.status(200).json({ 
      message: 'Comment added successfully!', 
      commentId: newComment._id.toString() 
    });
  } catch (err) {
    debugComment('Error adding comment:', err);
    next(err);
  }
});

export { router as commentRouter };