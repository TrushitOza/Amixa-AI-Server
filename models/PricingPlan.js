const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  planType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: [true, 'Plan type is required']
  },
  credits: {
    type: Number,
    required: [true, 'Credits amount is required'],
    min: [1, 'Credits must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  features: [{
    type: String,
    trim: true
  }],
  validityDays: {
    type: Number,
    default: null // null for subscriptions, number for one-time packs
  },
  rolloverCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  priority: {
    type: Number,
    default: 0 // For sorting plans
  },
  razorpayPlanId: {
    type: String,
    default: null // For subscription plans
  },
  metadata: {
    popular: {
      type: Boolean,
      default: false
    },
    recommended: {
      type: Boolean,
      default: false
    },
    maxCreditsPerDay: {
      type: Number,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
pricingPlanSchema.index({ planType: 1, isActive: 1 });
pricingPlanSchema.index({ priority: 1 });
pricingPlanSchema.index({ name: 1 });

// Static method to get active plans by type
pricingPlanSchema.statics.getActivePlans = function(planType = null) {
  const query = { isActive: true };
  if (planType) {
    query.planType = planType;
  }
  
  return this.find(query).sort({ priority: 1, price: 1 });
};

// Static method to get plan by name
pricingPlanSchema.statics.getPlanByName = function(name) {
  return this.findOne({ name, isActive: true });
};

// Instance method to calculate next billing date
pricingPlanSchema.methods.calculateNextBillingDate = function(startDate = new Date()) {
  const date = new Date(startDate);
  
  switch (this.planType) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date;
};

// Instance method to check if plan is subscription
pricingPlanSchema.methods.isSubscription = function() {
  return ['monthly', 'yearly'].includes(this.planType);
};

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
