const express = require('express');
const {
  downloadImage,
  getDownloadInfo
} = require('../controllers/downloadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public download route (no auth required - you can change this if needed)
router.get('/:imageId', downloadImage);

// Protected routes (auth required)
router.use(protect);

// Get download information
router.get('/:imageId/info', getDownloadInfo);

module.exports = router;
