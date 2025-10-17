const express = require('express');
const {
  toggleLikeImage,
  getLikedImages
} = require('../controllers/likedController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All liked routes require authentication
router.use(protect);

// Get all liked images
router.get('/', getLikedImages);

// Toggle like status of a single image
router.patch('/:imageId/toggle', toggleLikeImage);

module.exports = router;
