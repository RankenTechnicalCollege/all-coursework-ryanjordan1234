import express from 'express';
import debug from 'debug';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import * as db from '../../database.js';

const debugComment = debug('app:api:comment');
const router = express.Router();

// Joi Schema for creating a comment
const createCommentSchema = Joi.object({
  author: Joi.string().required(),
  comment: Joi.string().required()
});

// Helper function to validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// GET /api/bugs/:bugId/comments
router.get('/:bugId/comments', async (req, res, next) => {
  try {
    debugComment('GET /api/bugs/:bugId/comments');
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
    
    debugComment(`Found ${bug.comments?.length || 0} comments for bug ${bugId}`);
    res.json(bug.comments || []);
  } catch (err) {
    debugComment('Error finding comments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bugs/:bugId/comments/:commentId
router.get('/:bugId/comments/:commentId', async (req, res, next) => {
  try {
    debugComment('GET /api/bugs/:bugId/comments/:commentId');
    const { bugId, commentId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ error: `commentId ${commentId} is not a valid ObjectId.` });
    }
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Find comment by ID
    const comment = bug.comments?.find(c => c._id.toString() === commentId);
    
    if (!comment) {
      return res.status(404).json({ error: `Comment ${commentId} not found.` });
    }
    
    debugComment(`Comment found: ${commentId}`);
    res.json(comment);
  } catch (err) {
    debugComment('Error finding comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bugs/:bugId/comments
router.post('/:bugId/comments', async (req, res, next) => {
  try {
    debugComment('POST /api/bugs/:bugId/comments');
    const { bugId } = req.params;
    
    // Validate ObjectId
    if (!isValidObjectId(bugId)) {
      return res.status(400).json({ error: `bugId ${bugId} is not a valid ObjectId.` });
    }
    
    // Validate request body with Joi
    const validateResult = createCommentSchema.validate(req.body);
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    
    const { author, comment } = req.body;
    
    // Find bug by ID
    const bug = await db.findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    }
    
    // Create new comment
    const newComment = {
      _id: new ObjectId(),
      author,
      comment,
      createdAt: new Date()
    };
    
    // Add comment to bug's comments array
    await db.addCommentToBug(bugId, newComment);
    
    debugComment(`Comment added to bug ${bugId}`);
    res.status(200).json({ 
      message: 'Comment added successfully!', 
      commentId: newComment._id.toString() 
    });
  } catch (err) {
    debugComment('Error adding comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as commentRouter };