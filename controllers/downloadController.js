const Image = require('../models/Image');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Download image in specified format
const downloadImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { format = 'png', quality = 90, size } = req.query;
    const userId = req.user?.id;

    // Validate imageId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image ID'
      });
    }

    // Validate format
    const supportedFormats = ['png', 'jpg', 'jpeg', 'webp', 'ico', 'bmp', 'tiff'];
    if (!supportedFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`
      });
    }

    // Find the image and check ownership (optional - you can make downloads public)
    const image = await Image.findOne({ 
      _id: imageId, 
      ...(userId && { userId }) // Only check ownership if user is authenticated
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found or access denied'
      });
    }

    // Get the original image file path
    const originalImagePath = path.join(__dirname, '..', 'public', image.imagePath);

    // Check if original file exists
    if (!fs.existsSync(originalImagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Original image file not found'
      });
    }

    // Process image with Sharp
    let sharpInstance = sharp(originalImagePath);

    // Apply size transformation if requested
    if (size) {
      const [width, height] = size.split('x').map(Number);
      if (width && height && width <= 4096 && height <= 4096) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Convert to requested format
    let outputBuffer;
    let mimeType;
    let fileExtension = format.toLowerCase();

    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
        outputBuffer = await sharpInstance
          .jpeg({ quality: Math.min(Math.max(parseInt(quality), 1), 100) })
          .toBuffer();
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
        break;

      case 'png':
        outputBuffer = await sharpInstance
          .png({ quality: Math.min(Math.max(parseInt(quality), 1), 100) })
          .toBuffer();
        mimeType = 'image/png';
        break;

      case 'webp':
        outputBuffer = await sharpInstance
          .webp({ quality: Math.min(Math.max(parseInt(quality), 1), 100) })
          .toBuffer();
        mimeType = 'image/webp';
        break;

      case 'ico':
        // For ICO, resize to common icon sizes
        const iconSize = size ? parseInt(size.split('x')[0]) : 256;
        const validIconSizes = [16, 32, 48, 64, 128, 256];
        const finalIconSize = validIconSizes.includes(iconSize) ? iconSize : 256;
        
        outputBuffer = await sharpInstance
          .resize(finalIconSize, finalIconSize)
          .png()
          .toBuffer();
        mimeType = 'image/x-icon';
        break;

      case 'bmp':
        outputBuffer = await sharpInstance
          .bmp()
          .toBuffer();
        mimeType = 'image/bmp';
        break;

      case 'tiff':
        outputBuffer = await sharpInstance
          .tiff({ quality: Math.min(Math.max(parseInt(quality), 1), 100) })
          .toBuffer();
        mimeType = 'image/tiff';
        break;

      default:
        outputBuffer = await sharpInstance
          .png()
          .toBuffer();
        mimeType = 'image/png';
        fileExtension = 'png';
    }

    // Generate download filename
    const timestamp = Date.now();
    const sanitizedPrompt = image.prompt
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    const filename = `${sanitizedPrompt}_${timestamp}.${fileExtension}`;

    // Set response headers for download
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': outputBuffer.length,
      'Cache-Control': 'no-cache'
    });

    // Log download activity
    console.log(`Image downloaded: ${imageId} as ${format} by user ${userId || 'anonymous'}`);

    // Send the processed image
    res.send(outputBuffer);

  } catch (error) {
    console.error('Download image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process and download image',
      error: error.message
    });
  }
};

// Get download info (without actually downloading)
const getDownloadInfo = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    // Validate imageId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image ID'
      });
    }

    // Find the image
    const image = await Image.findOne({ 
      _id: imageId,
      ...(userId && { userId })
    }).select('prompt style imageUrl imageType aiProvider metadata createdAt');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found or access denied'
      });
    }

    // Get original file info
    const originalImagePath = path.join(__dirname, '..', 'public', image.imagePath);
    let fileStats = null;
    
    if (fs.existsSync(originalImagePath)) {
      fileStats = fs.statSync(originalImagePath);
    }

    res.status(200).json({
      success: true,
      message: 'Download info retrieved successfully',
      data: {
        image: {
          id: image._id,
          prompt: image.prompt,
          style: image.style,
          imageType: image.imageType,
          aiProvider: image.aiProvider,
          createdAt: image.createdAt
        },
        originalFile: {
          exists: !!fileStats,
          size: fileStats ? fileStats.size : null,
          sizeFormatted: fileStats ? `${(fileStats.size / 1024 / 1024).toFixed(2)} MB` : null
        },
        supportedFormats: ['png', 'jpg', 'jpeg', 'webp', 'ico', 'bmp', 'tiff'],
        supportedSizes: ['256x256', '512x512', '1024x1024', '2048x2048'],
        downloadUrl: `/api/v1/download/${imageId}`
      }
    });

  } catch (error) {
    console.error('Get download info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  downloadImage,
  getDownloadInfo
};
