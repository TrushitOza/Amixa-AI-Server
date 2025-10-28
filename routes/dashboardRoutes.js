const express = require('express');
const {
  getDashboardOverview,
  getDashboardStats,
  getRecentActivity,
  getPopularStyles
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// Dashboard overview - main dashboard data
router.get('/overview', getDashboardOverview);

// Dashboard statistics with period filter
router.get('/stats', getDashboardStats);

// Recent activity with pagination
router.get('/activity', getRecentActivity);

// Popular styles with detailed statistics
router.get('/styles', getPopularStyles);

module.exports = router;
