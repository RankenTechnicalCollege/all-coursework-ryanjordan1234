import express from 'express';
const router = express.Router();

import debug from 'debug';
const debugBug = debug('app:BugRouter');

router.use(express.urlencoded({extended: false}));

const bugsArray = [];

import { nanoid } from 'nanoid';

router.get('/list', (req, res) => {
  debugBug('bug list route hit');
  res.json(bugsArray);
});

// GET /api/bug/:bugId - Get specific bug by ID (5pts)
router.get('/:bugId', (req, res) => {
  const bugId = req.params.bugId;
  debugBug(`Getting bug with ID: ${bugId}`);
  
  const bug = bugsArray.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  res.json(bug);
});

// POST /api/bug/new - Create new bug (15pts)
router.post('/new', (req, res) => {
  const { title, description, stepsToReproduce } = req.body;
  
  debugBug('New bug creation attempt');
  
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
    classification: null,
    classifiedOn: null,
    assignedToUserId: null,
    assignedToUserName: null,
    assignedOn: null,
    closed: false,
    closedOn: null,
    createdOn: new Date(),
    lastUpdated: new Date()
  };
  
  bugsArray.push(newBug);
  debugBug(`New bug reported: ${title}`);
  
  res.status(200).type('text/plain').send('New bug reported!');
});

// PUT /api/bug/:bugId - Update existing bug (15pts)
router.put('/:bugId', (req, res) => {
  const bugId = req.params.bugId;
  const { title, description, stepsToReproduce } = req.body;
  
  debugBug(`Updating bug with ID: ${bugId}`);
  
  const bug = bugsArray.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update only provided fields
  if (title !== undefined) bug.title = title;
  if (description !== undefined) bug.description = description;
  if (stepsToReproduce !== undefined) bug.stepsToReproduce = stepsToReproduce;
  
  // Update lastUpdated timestamp
  bug.lastUpdated = new Date();
  
  debugBug(`Bug ${bugId} updated successfully`);
  res.status(200).type('text/plain').send('Bug updated!');
});

// PUT /api/bug/:bugId/classify - Classify bug (5pts)
router.put('/:bugId/classify', (req, res) => {
  const bugId = req.params.bugId;
  const { classification } = req.body;
  
  debugBug(`Classifying bug with ID: ${bugId}`);
  
  // Validate required fields
  if (!classification) {
    return res.status(400).type('text/plain').send('Classification is required.');
  }
  
  const bug = bugsArray.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update classification fields
  bug.classification = classification;
  bug.classifiedOn = new Date();
  bug.lastUpdated = new Date();
  
  debugBug(`Bug ${bugId} classified as: ${classification}`);
  res.status(200).type('text/plain').send('Bug classified!');
});

// PUT /api/bug/:bugId/assign - Assign bug to user (5pts)
router.put('/:bugId/assign', (req, res) => {
  const bugId = req.params.bugId;
  const { assignedToUserId, assignedToUserName } = req.body;
  
  debugBug(`Assigning bug with ID: ${bugId}`);
  
  // Validate required fields
  if (!assignedToUserId) {
    return res.status(400).type('text/plain').send('Assigned to user ID is required.');
  }
  if (!assignedToUserName) {
    return res.status(400).type('text/plain').send('Assigned to user name is required.');
  }
  
  const bug = bugsArray.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update assignment fields
  bug.assignedToUserId = assignedToUserId;
  bug.assignedToUserName = assignedToUserName;
  bug.assignedOn = new Date();
  bug.lastUpdated = new Date();
  
  debugBug(`Bug ${bugId} assigned to: ${assignedToUserName}`);
  res.status(200).type('text/plain').send('Bug assigned!');
});

// PUT /api/bug/:bugId/close - Close bug (5pts)
router.put('/:bugId/close', (req, res) => {
  const bugId = req.params.bugId;
  const { closed } = req.body;
  
  debugBug(`Closing bug with ID: ${bugId}`);
  
  // Validate required fields
  if (closed === undefined) {
    return res.status(400).type('text/plain').send('Closed status is required.');
  }
  
  const bug = bugsArray.find(b => b.id === bugId);
  
  if (!bug) {
    return res.status(404).type('text/plain').send(`Bug ${bugId} not found.`);
  }
  
  // Update closing fields
  bug.closed = closed;
  bug.closedOn = closed ? new Date() : null;
  bug.lastUpdated = new Date();
  
  debugBug(`Bug ${bugId} closed status: ${closed}`);
  res.status(200).type('text/plain').send('Bug closed!');
});

export { router as BugRouter };