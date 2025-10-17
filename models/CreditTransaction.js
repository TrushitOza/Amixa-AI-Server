const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['consume', 'add', 'reset', 'refund'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  balanceBefore: {
    type: Number,
    required: [true, 'Balance before transaction is required'],
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: [true, 'Balance after transaction is required'],
    min: 0
  },
  reason: {
    type: String,
    required: [true, 'Transaction reason is required'],
    enum: [
      'image_generation',
      'logo_generation', 
      'image_blending',
      'daily_reset',
      'manual_add',
      'payment_received',
      'admin_add',
      'refund_failed_generation',
      'bonus_credits',
      'promotional_credits'
    ]
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  relatedImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    required: false // Only for image-related transactions
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Only for admin-initiated transactions
  },
  metadata: {
    paymentId: String,
    orderId: String,
    promotionCode: String,
    ipAddress: String,
    userAgent: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1, createdAt: -1 });
creditTransactionSchema.index({ reason: 1, createdAt: -1 });
creditTransactionSchema.index({ status: 1 });
creditTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Virtual for transaction direction (debit/credit)
creditTransactionSchema.virtual('direction').get(function() {
  return ['consume'].includes(this.type) ? 'debit' : 'credit';
});

// Static method to get user transaction history
creditTransactionSchema.statics.getUserTransactions = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    reason,
    startDate,
    endDate
  } = options;

  const query = { userId };

  if (type) query.type = type;
  if (reason) query.reason = reason;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('relatedImageId', 'prompt imageType')
    .populate('adminId', 'firstname lastname email');
};

// Static method to get transaction statistics
creditTransactionSchema.statics.getTransactionStats = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
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
  ]);
};

// Instance method to format transaction for display
creditTransactionSchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    type: this.type,
    direction: this.direction,
    amount: this.amount,
    balanceBefore: this.balanceBefore,
    balanceAfter: this.balanceAfter,
    reason: this.reason,
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    relatedImage: this.relatedImageId ? {
      id: this.relatedImageId._id,
      prompt: this.relatedImageId.prompt,
      type: this.relatedImageId.imageType
    } : null,
    admin: this.adminId ? {
      id: this.adminId._id,
      name: `${this.adminId.firstname} ${this.adminId.lastname}`,
      email: this.adminId.email
    } : null
  };
};

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
