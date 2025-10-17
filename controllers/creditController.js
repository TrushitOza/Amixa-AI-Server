const { getCreditInfo, addCredits, checkAndResetDailyCredits } = require('../services/creditService');

// Get user's credit information
const getUserCredits = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const creditInfo = await getCreditInfo(userId);

    res.status(200).json({
      success: true,
      message: 'Credit information retrieved successfully',
      data: creditInfo
    });

  } catch (error) {
    console.error('Get user credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve credit information',
      error: error.message
    });
  }
};

// Add credits to user account (for admin or payment integration)
const addUserCredits = async (req, res) => {
  try {
    const { userId, credits, reason } = req.body;
    const adminUserId = req.user?.id;

    // Validation
    if (!userId || !credits) {
      return res.status(400).json({
        success: false,
        message: 'User ID and credits amount are required'
      });
    }

    if (typeof credits !== 'number' || credits <= 0 || credits > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Credits must be a positive number between 1 and 1000'
      });
    }

    const result = await addCredits(userId, credits, reason || 'admin_add', adminUserId);

    console.log(`Admin ${adminUserId} added ${credits} credits to user ${userId}`);

    res.status(200).json({
      success: true,
      message: `Successfully added ${credits} credits`,
      data: result
    });

  } catch (error) {
    console.error('Add user credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add credits',
      error: error.message
    });
  }
};

// Manual credit reset (for testing or admin purposes)
const resetUserCredits = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await checkAndResetDailyCredits(userId);

    console.log(`Admin ${adminUserId} manually reset credits for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Credits reset successfully',
      data: result
    });

  } catch (error) {
    console.error('Reset user credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset credits',
      error: error.message
    });
  }
};

// Get credit statistics (for admin dashboard)
const getCreditStats = async (req, res) => {
  try {
    const User = require('../models/User');

    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalCreditsUsed: { $sum: '$totalCreditsUsed' },
          totalCreditsAdded: { $sum: '$totalCreditsAdded' },
          averageCreditsPerUser: { $avg: '$credits' },
          usersWithZeroCredits: {
            $sum: { $cond: [{ $eq: ['$credits', 0] }, 1, 0] }
          }
        }
      }
    ]);

    const recentActivity = await User.find({
      lastCreditReset: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    res.status(200).json({
      success: true,
      message: 'Credit statistics retrieved successfully',
      data: {
        overview: stats[0] || {
          totalUsers: 0,
          totalCreditsUsed: 0,
          totalCreditsAdded: 0,
          averageCreditsPerUser: 0,
          usersWithZeroCredits: 0
        },
        recentActivity: {
          usersResetToday: recentActivity
        }
      }
    });

  } catch (error) {
    console.error('Get credit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve credit statistics',
      error: error.message
    });
  }
};

module.exports = {
  getUserCredits,
  addUserCredits,
  resetUserCredits,
  getCreditStats
};
