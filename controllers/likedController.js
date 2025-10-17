const Image = require('../models/Image');
const mongoose = require('mongoose');

// Toggle like status of an image
const toggleLikeImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Validate imageId
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image ID'
      });
    }

    // Find the image and check ownership
    const image = await Image.findOne({ _id: imageId, userId });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found or you do not have permission to modify it'
      });
    }

    // Toggle like status
    const newLikeStatus = !image.isLiked;
    
    const updatedImage = await Image.findByIdAndUpdate(
      imageId,
      { isLiked: newLikeStatus },
      { new: true }
    ).select('_id prompt style imageUrl imageType isLiked createdAt');

    res.status(200).json({
      success: true,
      message: newLikeStatus ? 'Image liked successfully' : 'Image unliked successfully',
      data: {
        id: updatedImage._id,
        isLiked: updatedImage.isLiked,
        prompt: updatedImage.prompt,
        style: updatedImage.style,
        imageUrl: updatedImage.imageUrl,
        imageType: updatedImage.imageType,
        createdAt: updatedImage.createdAt
      }
    });

  } catch (error) {
    console.error('Toggle like image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all liked images for user
const getLikedImages = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { 
      page = 1, 
      limit = 20, 
      imageType,
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
    const query = { userId, isLiked: true };

    // Add optional filters
    if (imageType && ['generated', 'blended', 'logo'].includes(imageType)) {
      query.imageType = imageType;
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
    const likedImages = await Image.find(query)
      .sort(sortOptions)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .select('prompt style imageUrl aiProvider imageType isLiked createdAt metadata')
      .lean();

    // Get total count for pagination
    const total = await Image.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / options.limit);
    const hasNextPage = options.page < totalPages;
    const hasPrevPage = options.page > 1;

    res.status(200).json({
      success: true,
      message: 'Liked images retrieved successfully',
      data: {
        images: likedImages,
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
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get liked images error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  toggleLikeImage,
  getLikedImages
};
