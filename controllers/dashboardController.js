const Image = require('../models/Image');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const mongoose = require('mongoose');

// Helper function to format time ago
const formatTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
};

// Get overall dashboard data for user
const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user data for credits info
    const user = await User.findById(userId).select('credits totalCreditsUsed');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parallel queries for better performance
    const [
      totalImages,
      totalLogos,
      totalFavorites,
      recentActivity,
      styleStats
    ] = await Promise.all([
      // Total images count for user
      Image.countDocuments({ userId, status: 'completed' }),
      
      // Total logos count for user
      Image.countDocuments({ userId, imageType: 'logo', status: 'completed' }),
      
      // Total favorites count
      Image.countDocuments({ userId, isLiked: true, status: 'completed' }),
      
      // Recent activity (last 5 items)
      Image.find({ userId, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(4)
        .select('prompt imageType imageUrl createdAt style')
        .lean(),
      
      // Style statistics
      Image.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' }
        },
        {
          $group: {
            _id: '$style',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    // Calculate style percentages
    const totalStyleCount = styleStats.reduce((sum, style) => sum + style.count, 0);
    const popularStyles = styleStats.map(style => ({
      style: style._id,
      count: style.count,
      percentage: totalStyleCount > 0 ? Math.round((style.count / totalStyleCount) * 100) : 0
    }));

    // Format recent activity with time ago
    const formattedRecentActivity = recentActivity.map(item => ({
      id: item._id,
      prompt: item.prompt,
      imageType: item.imageType,
      imageUrl: item.imageUrl,
      style: item.style,
      timeAgo: formatTimeAgo(item.createdAt),
      createdAt: item.createdAt
    }));

    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        overview: {
          totalImages,
          totalLogos,
          creditsUsed: user.totalCreditsUsed || 0,
          currentCredits: user.credits || 0,
          favorites: totalFavorites
        },
        recentActivity: formattedRecentActivity,
        popularStyles: popularStyles.slice(0, 10) // Top 10 styles
      }
    });

  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get detailed statistics for dashboard
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { period = '30' } = req.query; // Default to 30 days

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get statistics for the specified period
    const [
      periodImages,
      imageTypeStats,
      creditTransactionStats,
      dailyActivity
    ] = await Promise.all([
      // Images created in period
      Image.countDocuments({ 
        userId, 
        status: 'completed',
        createdAt: { $gte: startDate }
      }),
      
      // Image type breakdown
      Image.aggregate([
        {
          $match: { 
            userId: new mongoose.Types.ObjectId(userId), 
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$imageType',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Credit transaction stats
      CreditTransaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      
      // Daily activity for chart
      Image.aggregate([
        {
          $match: { 
            userId: new mongoose.Types.ObjectId(userId), 
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        period: {
          days,
          imagesCreated: periodImages
        },
        imageTypes: imageTypeStats,
        creditTransactions: creditTransactionStats,
        dailyActivity
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent activity with pagination
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 5 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50) // Max 50 items per page
    };

    const recentActivity = await Image.find({ 
      userId, 
      status: 'completed' 
    })
      .sort({ createdAt: -1 })
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .select('prompt imageType imageUrl createdAt style aiProvider')
      .lean();

    const total = await Image.countDocuments({ userId, status: 'completed' });

    const formattedActivity = recentActivity.map(item => ({
      id: item._id,
      prompt: item.prompt,
      imageType: item.imageType,
      imageUrl: item.imageUrl,
      style: item.style,
      aiProvider: item.aiProvider,
      timeAgo: formatTimeAgo(item.createdAt),
      createdAt: item.createdAt
    }));

    res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: {
        activity: formattedActivity,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        }
      }
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get popular styles with detailed statistics
const getPopularStyles = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { period = 'all' } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let matchCondition = { 
      userId: new mongoose.Types.ObjectId(userId), 
      status: 'completed' 
    };

    // Add date filter if period is specified
    if (period !== 'all') {
      const days = parseInt(period) || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      matchCondition.createdAt = { $gte: startDate };
    }

    const styleStats = await Image.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            style: '$style',
            imageType: '$imageType'
          },
          count: { $sum: 1 },
          recentUsage: { $max: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$_id.style',
          totalCount: { $sum: '$count' },
          imageTypes: {
            $push: {
              type: '$_id.imageType',
              count: '$count'
            }
          },
          lastUsed: { $max: '$recentUsage' }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // Calculate total for percentages
    const totalStyleUsage = styleStats.reduce((sum, style) => sum + style.totalCount, 0);

    const popularStyles = styleStats.map(style => ({
      style: style._id,
      count: style.totalCount,
      percentage: totalStyleUsage > 0 ? Math.round((style.totalCount / totalStyleUsage) * 100) : 0,
      imageTypes: style.imageTypes,
      lastUsed: style.lastUsed,
      lastUsedAgo: formatTimeAgo(style.lastUsed)
    }));

    res.status(200).json({
      success: true,
      message: 'Popular styles retrieved successfully',
      data: {
        styles: popularStyles,
        totalUsage: totalStyleUsage,
        period: period === 'all' ? 'All time' : `Last ${period} days`
      }
    });

  } catch (error) {
    console.error('Get popular styles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardStats,
  getRecentActivity,
  getPopularStyles
};
