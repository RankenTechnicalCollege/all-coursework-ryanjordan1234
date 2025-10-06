import express from 'express';
import debug from 'debug';
import { nanoid } from 'nanoid';

const debugBug = debug('app:api:bug');
const router = express.Router();

// In-memory storage for bugs
let bugs = [];

// GET /api/bug/list
router.get('/list', (req, res) => {
  debugBug('GET /api/bug/list');
  res.json(bugs);
});

// GET /api/bug/:bugId
router.get('/:bugId', (req, res) => {
  debugBug('GET /api/bug/:bugId');
  
  const { bugId } = req.params;
  
  // Find bug by ID
  const bug = bugs.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  debugBug(`Bug found: ${bugId}`);
  res.json(bug);
});

// POST /api/bug/new
router.post('/new', (req, res) => {
  debugBug('POST /api/bug/new');
  
  const { title, description, stepsToReproduce } = req.body;
  
  // Validate required fields
  if (!title) {
    return res.status(400).type('text/plain').send('Title is required.');
  }
  if (!description) {
    return res.status(400).type('text/plain').send('Description is required.');
  }
  if (!stepsToReproduce) {
    return res.status(400).type('text/plain').send('Steps to reproduce is required.');
  }
  
  // Create new bug
  const newBug = {
    id: nanoid(),
    title,
    description,
    stepsToReproduce,
    createdAt: new Date(),
    lastUpdated: new Date(),
    classification: null,
    classifiedOn: null,
    assignedToUserId: null,
    assignedToUserName: null,
    assignedOn: null,
    closed: false,
    closedOn: null
  };
  
  bugs.push(newBug);
  debugBug(`Bug created: ${newBug.id}`);
  
  res.status(200).type('text/plain').send('New bug reported!');
});

// PUT /api/bug/:bugId
router.put('/:bugId', (req, res) => {
  debugBug('PUT /api/bug/:bugId');
  
  const { bugId } = req.params;
  const { title, description, stepsToReproduce } = req.body;
  
  // Find bug by ID
  const bug = bugs.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update only provided fields
  if (title !== undefined) bug.title = title;
  if (description !== undefined) bug.description = description;
  if (stepsToReproduce !== undefined) bug.stepsToReproduce = stepsToReproduce;
  
  bug.lastUpdated = new Date();
  
  debugBug(`Bug updated: ${bugId}`);
  res.status(200).type('text/plain').send('Bug updated!');
});

// PUT /api/bug/:bugId/classify
router.put('/:bugId/classify', (req, res) => {
  debugBug('PUT /api/bug/:bugId/classify');
  
  const { bugId } = req.params;
  const { classification } = req.body;
  
  // Validate required field
  if (!classification) {
    return res.status(400).type('text/plain').send('Classification is required.');
  }
  
  // Find bug by ID
  const bug = bugs.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update classification fields
  bug.classification = classification;
  bug.classifiedOn = new Date();
  bug.lastUpdated = new Date();
  
  debugBug(`Bug classified: ${bugId}`);
  res.status(200).type('text/plain').send('Bug classified!');
});

// PUT /api/bug/:bugId/assign
router.put('/:bugId/assign', (req, res) => {
  debugBug('PUT /api/bug/:bugId/assign');
  
  const { bugId } = req.params;
  const { assignedToUserId, assignedToUserName } = req.body;
  
  // Validate required fields
  if (!assignedToUserId) {
    return res.status(400).type('text/plain').send('Assigned to user ID is required.');
  }
  if (!assignedToUserName) {
    return res.status(400).type('text/plain').send('Assigned to user name is required.');
  }
  
  // Find bug by ID
  const bug = bugs.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update assignment fields
  bug.assignedToUserId = assignedToUserId;
  bug.assignedToUserName = assignedToUserName;
  bug.assignedOn = new Date();
  bug.lastUpdated = new Date();
  
  debugBug(`Bug assigned: ${bugId} to ${assignedToUserName}`);
  res.status(200).type('text/plain').send('Bug assigned!');
});

// PUT /api/bug/:bugId/close
router.put('/:bugId/close', (req, res) => {
  debugBug('PUT /api/bug/:bugId/close');
  
  const { bugId } = req.params;
  const { closed } = req.body;
  
  // Validate required field
  if (closed === undefined || closed === null) {
    return res.status(400).type('text/plain').send('Closed status is required.');
  }
  
  // Find bug by ID
  const bug = bugs.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update closed fields
  bug.closed = closed;
  bug.closedOn = closed ? new Date() : null;
  bug.lastUpdated = new Date();
  
  debugBug(`Bug closed: ${bugId}`);
  res.status(200).type('text/plain').send('Bug closed!');
});

export { router as bugRouter };