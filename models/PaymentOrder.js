const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PricingPlan',
    required: [true, 'Plan ID is required']
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    default: null,
    index: true
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'created',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet', 'razorpay', null],
    default: null,
    required: false
  },
  credits: {
    type: Number,
    required: [true, 'Credits amount is required'],
    min: [1, 'Credits must be at least 1']
  },
  planType: {
    type: String,
    enum: ['one_time', 'monthly', 'yearly'],
    required: [true, 'Plan type is required']
  },
  validityDays: {
    type: Number,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  refundId: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    promocode: String,
    discount: Number
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Orders expire after 1 hour
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentOrderSchema.index({ razorpayOrderId: 1 });
paymentOrderSchema.index({ razorpayPaymentId: 1 });
paymentOrderSchema.index({ status: 1, createdAt: -1 });
paymentOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get user's payment history
paymentOrderSchema.statics.getUserPaymentHistory = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    planType,
    startDate,
    endDate
  } = options;

  const query = { userId };

  if (status) query.status = status;
  if (planType) query.planType = planType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('planId', 'name displayName credits price')
    .populate('userId', 'firstname lastname email');
};

// Static method to get order by Razorpay order ID
paymentOrderSchema.statics.getByRazorpayOrderId = function(razorpayOrderId) {
  return this.findOne({ razorpayOrderId })
    .populate('userId', 'firstname lastname email')
    .populate('planId', 'name displayName credits price planType');
};

// Instance method to mark as paid
paymentOrderSchema.methods.markAsPaid = function(paymentId, signature, paymentMethod = null) {
  this.status = 'paid';
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  this.paymentMethod = paymentMethod;
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
paymentOrderSchema.methods.markAsFailed = function(reason = null) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

// Instance method to check if order is expired
paymentOrderSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to format for display
paymentOrderSchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    razorpayOrderId: this.razorpayOrderId,
    razorpayPaymentId: this.razorpayPaymentId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    credits: this.credits,
    planType: this.planType,
    plan: this.planId ? {
      id: this.planId._id,
      name: this.planId.name,
      displayName: this.planId.displayName,
      price: this.planId.price
    } : null,
    createdAt: this.createdAt,
    processedAt: this.processedAt,
    failureReason: this.failureReason
  };
};

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
