const express = require('express');
const {
  getUserHistory,
  getHistoryStats,
  deleteHistoryItem,
  deleteAllHistory
} = require('../controllers/historyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All history routes require authentication
router.use(protect);

// Get user's image generation history
router.get('/', getUserHistory);

// Get history statistics
router.get('/stats', getHistoryStats);

// Delete all user history (must come before /:imageId to avoid conflict)
router.delete('/all', deleteAllHistory);

// Delete single history item
router.delete('/:imageId', deleteHistoryItem);

module.exports = router;
