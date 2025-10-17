const User = require('../models/User');
const Image = require('../models/Image');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    // Build query
    const query = {};
    
    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };

    const users = await User.find(query)
      .select('-password -emailOtp -passwordResetOtp -resetPasswordToken')
      .sort({ createdAt: -1 })
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / options.limit);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: options.page,
          totalPages,
          totalUsers: total,
          usersPerPage: options.limit,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "admin"'
      });
    }

    // Prevent admin from changing their own role
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log(`Admin ${adminId} changed user ${userId} role from ${oldRole} to ${role}`);

    res.status(200).json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      data: {
        userId: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        oldRole,
        newRole: role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

// Get system statistics (admin only)
const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalImages,
      recentUsers,
      recentImages,
      imagesByType
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Image.countDocuments(),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Image.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Image.aggregate([
        { $group: { _id: '$imageType', count: { $sum: 1 } } }
      ])
    ]);

    const imageTypeStats = imagesByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          regularUsers: totalUsers - totalAdmins,
          recentSignups: recentUsers
        },
        images: {
          total: totalImages,
          recentGenerated: recentImages,
          byType: imageTypeStats
        },
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics',
      error: error.message
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's images first
    const deletedImages = await Image.deleteMany({ userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    console.log(`Admin ${adminId} deleted user ${userId} and ${deletedImages.deletedCount} associated images`);

    res.status(200).json({
      success: true,
      message: 'User and associated data deleted successfully',
      data: {
        deletedUser: {
          id: userId,
          email: user.email,
          name: `${user.firstname} ${user.lastname}`
        },
        deletedImages: deletedImages.deletedCount
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  getSystemStats,
  deleteUser
};
