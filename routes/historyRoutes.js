const express = require('express');
const {
  getUserHistory,
  getHistoryStats
} = require('../controllers/historyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All history routes require authentication
router.use(protect);

// Get user's image generation history
router.get('/', getUserHistory);

// Get history statistics
router.get('/stats', getHistoryStats);

module.exports = router;
