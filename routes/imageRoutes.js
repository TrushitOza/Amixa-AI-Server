const express = require('express');
const {
  generateImageFromPrompt,
  blendImagesFromUpload,
  generateLogoFromPrompt,
  getImageById,
  getUserImages
} = require('../controllers/imageController');
const { protect } = require('../middleware/auth');
const { handleImageUpload } = require('../middleware/upload');
const { requireCredits } = require('../services/creditService');

const router = express.Router();

// Public routes (no auth required)
router.get('/:id', getImageById);

// Protected routes (auth required)
router.use(protect);
router.post('/generate', requireCredits(1), generateImageFromPrompt);
router.post('/blend', requireCredits(1), handleImageUpload, blendImagesFromUpload);
router.post('/logo', requireCredits(1), generateLogoFromPrompt);
router.get('/', getUserImages);

module.exports = router;
