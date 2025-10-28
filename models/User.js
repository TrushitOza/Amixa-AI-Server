const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastname: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailOtp: String,
  emailOtpExpires: Date,
  lastOtpSent: Date,
  passwordResetOtp: String,
  passwordResetOtpExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  credits: {
    type: Number,
    default: 3,
    min: 0
  },
  lastCreditReset: {
    type: Date,
    default: Date.now
  },
  totalCreditsUsed: {
    type: Number,
    default: 0
  },
  totalCreditsAdded: {
    type: Number,
    default: 3 // Initial 3 credits
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Payment and Subscription Fields
  planCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  maxCredits: {
    type: Number,
    default: 3, // Start with initial 3 daily credits
    min: 0
  },
  currentPlan: {
    type: String,
    enum: [
      'free', 
      'starter_pack', 
      'popular_pack', 
      'power_pack', 
      'mega_pack',
      'basic_monthly',
      'pro_monthly', 
      'business_monthly',
      'pro_yearly',
      'business_yearly'
    ],
    default: 'free'
  },
  planType: {
    type: String,
    enum: ['monthly', 'yearly', null],
    default: null
  },
  planStartDate: {
    type: Date,
    default: null
  },
  planEndDate: {
    type: Date,
    default: null
  },
  nextBillingDate: {
    type: Date,
    default: null
  },
  isSubscriptionActive: {
    type: Boolean,
    default: false
  },
  subscriptionId: {
    type: String,
    default: null
  },
  razorpayCustomerId: {
    type: String,
    default: null
  },
  autoRenewal: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
