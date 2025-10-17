const Image = require('../models/Image');

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

module.exports = {
  getUserHistory,
  getHistoryStats
};
