const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll process images in memory)
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 4 // Maximum 4 files
  }
});

// Middleware for multiple image upload (2-4 images)
// Accept files with any field name
const uploadImages = upload.any();

// Wrapper middleware with better error handling
const handleImageUpload = (req, res, next) => {
  uploadImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 4 images allowed.'
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum 10MB per image.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Debug logging - show everything we received
    console.log('=== UPLOAD DEBUG ===');
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Files count:', req.files ? req.files.length : 0);
    
    if (req.files && req.files.length > 0) {
      console.log('File details:', req.files.map(f => ({ 
        fieldname: f.fieldname, 
        originalname: f.originalname, 
        size: f.size,
        mimetype: f.mimetype 
      })));
    }
    console.log('===================');

    // Filter only image files (in case any non-images got through)
    const images = req.files ? req.files.filter(f => f.mimetype.startsWith('image/')) : [];

    // Validate number of files
    if (!images || images.length < 2) {
      return res.status(400).json({
        success: false,
        message: `Please upload at least 2 images for blending. Received: ${images.length} image files. Total files: ${req.files ? req.files.length : 0}`
      });
    }

    if (images.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 4 images allowed for blending.'
      });
    }

    // Store filtered images back to req.files
    req.files = images;

    next();
  });
};

module.exports = {
  handleImageUpload
};
