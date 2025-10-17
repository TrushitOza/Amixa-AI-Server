const express = require('express');
const {
  getUserCredits,
  addUserCredits,
  resetUserCredits,
  getCreditStats
} = require('../controllers/creditController');
const { protect, protectAdmin } = require('../middleware/auth');

const router = express.Router();

// All credit routes require authentication
router.use(protect);

// Get user's credit information (any authenticated user)
router.get('/', getUserCredits);

// Admin-only routes
router.post('/add', protectAdmin, addUserCredits);
router.post('/reset/:userId', protectAdmin, resetUserCredits);
router.get('/stats', protectAdmin, getCreditStats);

module.exports = router;
