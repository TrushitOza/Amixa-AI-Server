const CreditTransaction = require('../models/CreditTransaction');
const mongoose = require('mongoose');

// Get user's credit transaction history
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      reason,
      startDate,
      endDate
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      type,
      reason,
      startDate,
      endDate
    };

    const transactions = await CreditTransaction.getUserTransactions(userId, options);
    const total = await CreditTransaction.countDocuments({ userId });

    const totalPages = Math.ceil(total / options.limit);

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions: transactions.map(t => t.toDisplayFormat()),
        pagination: {
          currentPage: options.page,
          totalPages,
          totalTransactions: total,
          transactionsPerPage: options.limit,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1
        },
        filters: {
          type: type || 'all',
          reason: reason || 'all',
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });

  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: error.message
    });
  }
};

// Get transaction statistics for user
const getUserTransactionStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const stats = await CreditTransaction.getTransactionStats(userId, parseInt(days));
    
    // Calculate totals
    const summary = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
      return acc;
    }, {});

    // Get recent transactions
    const recentTransactions = await CreditTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('relatedImageId', 'prompt imageType')
      .populate('adminId', 'firstname lastname');

    res.status(200).json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: {
        period: `Last ${days} days`,
        summary,
        recentTransactions: recentTransactions.map(t => t.toDisplayFormat()),
        totals: {
          consumed: summary.consume?.totalAmount || 0,
          added: summary.add?.totalAmount || 0,
          reset: summary.reset?.totalAmount || 0
        }
      }
    });

  } catch (error) {
    console.error('Get user transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction statistics',
      error: error.message
    });
  }
};

// Get single transaction details
const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    const transaction = await CreditTransaction.findOne({
      _id: transactionId,
      userId
    })
    .populate('relatedImageId', 'prompt style imageUrl imageType')
    .populate('adminId', 'firstname lastname email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction details retrieved successfully',
      data: transaction.toDisplayFormat()
    });

  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction details',
      error: error.message
    });
  }
};

// Admin: Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      reason,
      userId,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (reason) query.reason = reason;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };

    const transactions = await CreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .populate('userId', 'firstname lastname email')
      .populate('relatedImageId', 'prompt imageType')
      .populate('adminId', 'firstname lastname email');

    const total = await CreditTransaction.countDocuments(query);
    const totalPages = Math.ceil(total / options.limit);

    res.status(200).json({
      success: true,
      message: 'All transactions retrieved successfully',
      data: {
        transactions: transactions.map(t => ({
          ...t.toDisplayFormat(),
          user: t.userId ? {
            id: t.userId._id,
            name: `${t.userId.firstname} ${t.userId.lastname}`,
            email: t.userId.email
          } : null
        })),
        pagination: {
          currentPage: options.page,
          totalPages,
          totalTransactions: total,
          transactionsPerPage: options.limit,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions',
      error: error.message
    });
  }
};

module.exports = {
  getUserTransactions,
  getUserTransactionStats,
  getTransactionById,
  getAllTransactions
};
