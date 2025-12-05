import express from 'express';
import { 
  findBugById,          // NOT getBugById
  addCommentToBug       // ✅ Correct
} from '../../database.js';
import debug from 'debug';
import { ObjectId } from 'mongodb';
import { 
  isAuthenticated,      // ← Authentication check
  hasPermission         // ← Permission check
} from '../../middleware/auth.js';

const debugComments = debug('app:comments');
const router = express.Router();

// GET all comments for a bug
router.get('/:bugId/comments', isAuthenticated, hasPermission('canViewData'), async (req, res) => {
  const { bugId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  try {
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }

    // Return comments array (or empty array if no comments)
    const comments = bug.comments || [];
    debugComments(`Retrieved ${comments.length} comments for bug ${bugId}`);
    res.status(200).json(comments);
  } catch (err) {
    debugComments(`Error retrieving comments: ${err}`);
    res.status(500).json({ message: 'Error retrieving comments' });
  }
});

// POST - Add a comment to a bug
router.post('/:bugId/comments', isAuthenticated, hasPermission('canComment'), async (req, res) => {
  const { bugId } = req.params;
  const { text } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  // Create new comment object
  const newComment = {
    _id: new ObjectId(),
    author: req.user.email,
    authorName: req.user.fullName,
    text: text.trim(),
    createdAt: new Date(),
    createdBy: {
      userId: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName
    }
  };

  try {
    // Check if bug exists
    const bug = await findBugById(bugId);
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }

    // Add comment to bug
    const result = await addCommentToBug(bugId, newComment);
    
    if (result.modifiedCount === 1) {
      debugComments(`Comment added to bug ${bugId} by ${req.user.email}`);
      res.status(201).json({ 
        message: 'Comment added successfully',
        comment: newComment 
      });
    } else {
      res.status(500).json({ message: 'Error adding comment' });
    }
  } catch (err) {
    debugComments(`Error adding comment: ${err}`);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// PATCH - Update a comment
router.patch('/:bugId/comments/:commentId', isAuthenticated, async (req, res) => {
  const { bugId, commentId } = req.params;
  const { text } = req.body;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(commentId)) {
    return res.status(400).json({ message: 'Invalid comment ID' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  try {
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }

    // Find the comment
    const comment = bug.comments?.find(c => c._id.toString() === commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author !== req.user.email) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    // Update comment using MongoDB update
    const { updateBug } = await import('../../database.js');
    const result = await updateBug(bugId, {
      'comments.$[elem].text': text.trim(),
      'comments.$[elem].lastUpdatedOn': new Date(),
      'comments.$[elem].lastUpdatedBy': {
        userId: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName
      }
    });

    if (result.modifiedCount === 1) {
      debugComments(`Comment ${commentId} updated in bug ${bugId}`);
      res.status(200).json({ message: 'Comment updated successfully' });
    } else {
      res.status(500).json({ message: 'Error updating comment' });
    }
  } catch (err) {
    debugComments(`Error updating comment: ${err}`);
    res.status(500).json({ message: 'Error updating comment' });
  }
});

// DELETE - Delete a comment
router.delete('/:bugId/comments/:commentId', isAuthenticated, async (req, res) => {
  const { bugId, commentId } = req.params;

  if (!ObjectId.isValid(bugId)) {
    return res.status(400).json({ message: 'Invalid bug ID' });
  }

  if (!ObjectId.isValid(commentId)) {
    return res.status(400).json({ message: 'Invalid comment ID' });
  }

  try {
    const bug = await findBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ message: 'Bug not found' });
    }

    // Find the comment
    const comment = bug.comments?.find(c => c._id.toString() === commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author or has delete permission
    const canDelete = comment.author === req.user.email; // Add role check if needed

    if (!canDelete) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    // Remove comment from array
    const { updateBug } = await import('../../database.js');
    const result = await updateBug(bugId, {
      $pull: { comments: { _id: new ObjectId(commentId) } }
    });

    if (result.modifiedCount === 1) {
      debugComments(`Comment ${commentId} deleted from bug ${bugId}`);
      res.status(200).json({ message: 'Comment deleted successfully' });
    } else {
      res.status(500).json({ message: 'Error deleting comment' });
    }
  } catch (err) {
    debugComments(`Error deleting comment: ${err}`);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

export { router as commentRouter };