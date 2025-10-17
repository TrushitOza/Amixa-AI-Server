const express = require('express');
const {
  getAllUsers,
  updateUserRole,
  getSystemStats,
  deleteUser
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin authentication
router.use(protectAdmin);

// Get all users
router.get('/users', getAllUsers);

// Update user role
router.patch('/users/:userId/role', updateUserRole);

// Delete user
router.delete('/users/:userId', deleteUser);

// Get system statistics
router.get('/stats', getSystemStats);

module.exports = router;
