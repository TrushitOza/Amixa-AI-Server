const Image = require('../models/Image');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');

// Get user's image generation history
const getUserHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { 
      page = 1, 
      limit = 20, 
      imageType, 
      aiProvider,
      style,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Build query filter
    const query = { userId };

    // Add optional filters
    if (imageType && ['generated', 'blended', 'logo'].includes(imageType)) {
      query.imageType = imageType;
    }

    if (aiProvider && ['gemini', 'openai', 'huggingface'].includes(aiProvider)) {
      query.aiProvider = aiProvider;
    }

    if (style) {
      query.style = style.toLowerCase();
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 items per page
      sort: sortOptions
    };

    // Execute query with pagination
    const images = await Image.find(query)
      .sort(sortOptions)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .select('prompt style imageUrl aiProvider imageType status isLiked createdAt metadata')
      .lean(); // Use lean for better performance

    // Get total count for pagination
    const total = await Image.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / options.limit);
    const hasNextPage = options.page < totalPages;
    const hasPrevPage = options.page > 1;

    res.status(200).json({
      success: true,
      message: 'History retrieved successfully',
      data: {
        images,
        pagination: {
          currentPage: options.page,
          totalPages,
          totalItems: total,
          itemsPerPage: options.limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          imageType: imageType || 'all',
          aiProvider: aiProvider || 'all',
          style: style || 'all',
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get history statistics
const getHistoryStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Get various statistics
    const [
      totalImages,
      totalGenerated,
      totalBlended,
      totalLogos,
      totalLiked,
      providerStats,
      recentActivity
    ] = await Promise.all([
      // Total images
      Image.countDocuments({ userId }),
      
      // By image type
      Image.countDocuments({ userId, imageType: 'generated' }),
      Image.countDocuments({ userId, imageType: 'blended' }),
      Image.countDocuments({ userId, imageType: 'logo' }),
      
      // Liked images
      Image.countDocuments({ userId, isLiked: true }),
      
      // Provider statistics
      Image.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$aiProvider', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activity (last 7 days)
      Image.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'History statistics retrieved successfully',
      data: {
        overview: {
          totalImages,
          totalLiked,
          recentActivity
        },
        byType: {
          generated: totalGenerated,
          blended: totalBlended,
          logos: totalLogos
        },
        byProvider: providerStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        providerStats
      }
    });

  } catch (error) {
    console.error('Get history stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete single history item
const deleteHistoryItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { imageId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    // Find the image and verify ownership
    const image = await Image.findOne({ _id: imageId, userId });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found or you do not have permission to delete it'
      });
    }

    // Delete from Cloudinary if stored there
    if (image.metadata?.storageType === 'cloudinary' && image.metadata?.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(image.metadata.cloudinaryId);
        console.log(`Deleted image from Cloudinary: ${image.metadata.cloudinaryId}`);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete local file if stored locally
    if (image.metadata?.storageType === 'file' && image.imagePath) {
      try {
        const fullPath = path.join(__dirname, '..', image.imagePath);
        await fs.unlink(fullPath);
        console.log(`Deleted local file: ${fullPath}`);
      } catch (fileError) {
        console.error('Local file deletion error:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await Image.findByIdAndDelete(imageId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        deletedImageId: imageId
      }
    });

  } catch (error) {
    console.error('Delete history item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



// Delete all user history
const deleteAllHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Find all user images
    const images = await Image.find({ userId });

    if (images.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No images found to delete',
        data: {
          deletedCount: 0
        }
      });
    }

    const deletionResults = {
      successful: [],
      failed: [],
      cloudinaryErrors: [],
      fileErrors: []
    };

    // Process each image
    for (const image of images) {
      try {
        // Delete from Cloudinary if stored there
        if (image.metadata?.storageType === 'cloudinary' && image.metadata?.cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(image.metadata.cloudinaryId);
            console.log(`Deleted image from Cloudinary: ${image.metadata.cloudinaryId}`);
          } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError);
            deletionResults.cloudinaryErrors.push({
              imageId: image._id,
              cloudinaryId: image.metadata.cloudinaryId,
              error: cloudinaryError.message
            });
          }
        }

        // Delete local file if stored locally
        if (image.metadata?.storageType === 'file' && image.imagePath) {
          try {
            const fullPath = path.join(__dirname, '..', image.imagePath);
            await fs.unlink(fullPath);
            console.log(`Deleted local file: ${fullPath}`);
          } catch (fileError) {
            console.error('Local file deletion error:', fileError);
            deletionResults.fileErrors.push({
              imageId: image._id,
              filePath: image.imagePath,
              error: fileError.message
            });
          }
        }

        deletionResults.successful.push(image._id);

      } catch (error) {
        console.error(`Error processing image ${image._id}:`, error);
        deletionResults.failed.push({
          imageId: image._id,
          error: error.message
        });
      }
    }

    // Delete all user images from database
    const dbDeletionResult = await Image.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: `Successfully deleted all user history (${dbDeletionResult.deletedCount} images)`,
      data: {
        totalImages: images.length,
        deletedFromDatabase: dbDeletionResult.deletedCount,
        successfulFileDeletions: deletionResults.successful.length,
        results: deletionResults
      }
    });

  } catch (error) {
    console.error('Delete all history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getUserHistory,
  getHistoryStats,
  deleteHistoryItem,
  deleteAllHistory
};
