const express = require('express');
const {
  getUserTransactions,
  getUserTransactionStats,
  getTransactionById,
  getAllTransactions
} = require('../controllers/transactionController');
const { protect, protectAdmin } = require('../middleware/auth');

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

// User transaction routes
router.get('/', getUserTransactions);
router.get('/stats', getUserTransactionStats);
router.get('/:transactionId', getTransactionById);

// Admin transaction routes
router.get('/admin/all', protectAdmin, getAllTransactions);

module.exports = router;
