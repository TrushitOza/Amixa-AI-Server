const Razorpay = require('razorpay');
const crypto = require('crypto');
const PaymentOrder = require('../models/PaymentOrder');
const PricingPlan = require('../models/PricingPlan');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');

// Initialize Razorpay instance (lazy initialization)
let razorpay = null;

const initializeRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }
    
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// Create Razorpay order for payment
const createPaymentOrder = async (userId, planName, metadata = {}) => {
  try {
    // Get plan details
    const plan = await PricingPlan.getPlanByName(planName);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate amount in paise (Razorpay uses paise)
    const amountInPaise = Math.round(plan.price * 100);

    // Create Razorpay order
    const razorpayInstance = initializeRazorpay();
    // Generate short receipt (max 40 chars for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const userIdShort = userId.toString().slice(-8); // Last 8 chars of userId
    const receipt = `ord_${userIdShort}_${timestamp}`; // Format: ord_12345678_87654321 (max 25 chars)

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: plan.currency,
      receipt: receipt,
      notes: {
        userId: userId.toString(),
        planId: plan._id.toString(),
        planName: plan.name,
        planType: plan.planType,
        credits: plan.credits.toString()
      }
    });

    // Create payment order record in database
    const paymentOrder = await PaymentOrder.create({
      userId,
      planId: plan._id,
      razorpayOrderId: razorpayOrder.id,
      amount: plan.price,
      currency: plan.currency,
      credits: plan.credits,
      planType: plan.planType,
      validityDays: plan.validityDays,
      status: 'created',
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceInfo: metadata.deviceInfo,
        promocode: metadata.promocode
      }
    });

    return {
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: amountInPaise,
        currency: plan.currency,
        paymentOrderId: paymentOrder._id
      },
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        credits: plan.credits,
        price: plan.price,
        planType: plan.planType
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    };

  } catch (error) {
    console.error('Create payment order error:', error);
    throw error;
  }
};

// Verify Razorpay payment signature
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Payment signature verification error:', error);
    return false;
  }
};

// Process successful payment
const processSuccessfulPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod = null) => {
  try {
    // Verify payment signature (skip for webhook calls where signature is null)
    if (razorpaySignature) {
      const isValidSignature = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValidSignature) {
        throw new Error('Invalid payment signature');
      }
    }

    // Get payment order from database
    const paymentOrder = await PaymentOrder.getByRazorpayOrderId(razorpayOrderId);
    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    // Check if already processed
    if (paymentOrder.status === 'paid') {
      return {
        success: true,
        message: 'Payment already processed',
        alreadyProcessed: true
      };
    }

    // Mark payment as successful
    await paymentOrder.markAsPaid(razorpayPaymentId, razorpaySignature, paymentMethod);

    // Get plan details
    const plan = await PricingPlan.findById(paymentOrder.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get user and update both credits and plan information in one operation
    const user = await User.findById(paymentOrder.userId);
    const now = new Date();
    
    // Add credits to planCredits
    user.planCredits += paymentOrder.credits;
    user.totalCreditsAdded += paymentOrder.credits;
    
    // Set maxCredits to current capacity (daily + plan credits)
    user.maxCredits = user.credits + user.planCredits;
    
    // Update subscription plan information (only monthly/yearly allowed)
    user.currentPlan = plan.name;
    user.planType = plan.planType;
    user.planStartDate = now;
    user.nextBillingDate = plan.calculateNextBillingDate(now);
    user.planEndDate = user.nextBillingDate;
    user.isSubscriptionActive = true;

    await user.save();

    // Create transaction record
    await CreditTransaction.create({
      userId: paymentOrder.userId,
      type: 'add',
      amount: paymentOrder.credits,
      balanceBefore: user.credits + (user.planCredits - paymentOrder.credits), // Before adding new credits
      balanceAfter: user.credits + user.planCredits,
      reason: 'plan_purchase',
      description: `Credits added - plan purchase (${plan.name})`,
      metadata: {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        planId: plan._id.toString(),
        planName: plan.name,
        planType: plan.planType
      },
      status: 'completed'
    });

    console.log(`Payment processed successfully for user ${paymentOrder.userId}: ${paymentOrder.credits} credits added`);
    console.log(`User credits after purchase - Daily: ${user.credits}, Plan: ${user.planCredits}, Total: ${user.credits + user.planCredits}`);

    return {
      success: true,
      message: 'Payment processed successfully',
      credits: paymentOrder.credits,
      plan: plan.name,
      currentCredits: {
        dailyCredits: user.credits,
        planCredits: user.planCredits,
        totalCredits: user.credits + user.planCredits
      },
      planInfo: {
        currentPlan: user.currentPlan,
        planType: user.planType,
        planStartDate: user.planStartDate,
        planEndDate: user.planEndDate,
        isActive: true
      }
    };

  } catch (error) {
    console.error('Process payment error:', error);
    throw error;
  }
};

// Handle failed payment
const processFailedPayment = async (razorpayOrderId, failureReason = null) => {
  try {
    const paymentOrder = await PaymentOrder.getByRazorpayOrderId(razorpayOrderId);
    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    await paymentOrder.markAsFailed(failureReason);

    console.log(`Payment failed for order ${razorpayOrderId}: ${failureReason}`);

    return {
      success: true,
      message: 'Payment failure recorded'
    };

  } catch (error) {
    console.error('Process failed payment error:', error);
    throw error;
  }
};

// Get payment details by order ID
const getPaymentDetails = async (razorpayOrderId) => {
  try {
    const paymentOrder = await PaymentOrder.getByRazorpayOrderId(razorpayOrderId);
    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    return {
      success: true,
      payment: paymentOrder.toDisplayFormat()
    };

  } catch (error) {
    console.error('Get payment details error:', error);
    throw error;
  }
};

// Get user's payment history
const getUserPaymentHistory = async (userId, options = {}) => {
  try {
    const payments = await PaymentOrder.getUserPaymentHistory(userId, options);
    const total = await PaymentOrder.countDocuments({ userId });

    return {
      success: true,
      payments: payments.map(p => p.toDisplayFormat()),
      total,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        total,
        pages: Math.ceil(total / (options.limit || 20))
      }
    };

  } catch (error) {
    console.error('Get payment history error:', error);
    throw error;
  }
};

// Create Razorpay customer (for subscriptions)
const createRazorpayCustomer = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.razorpayCustomerId) {
      return {
        success: true,
        customerId: user.razorpayCustomerId,
        existing: true
      };
    }

    const razorpayInstance = initializeRazorpay();
    const customer = await razorpayInstance.customers.create({
      name: `${user.firstname} ${user.lastname}`,
      email: user.email,
      contact: user.phone || '',
      notes: {
        userId: userId.toString()
      }
    });

    // Update user with Razorpay customer ID
    user.razorpayCustomerId = customer.id;
    await user.save();

    return {
      success: true,
      customerId: customer.id,
      existing: false
    };

  } catch (error) {
    console.error('Create Razorpay customer error:', error);
    throw error;
  }
};

// Refund payment
const refundPayment = async (razorpayPaymentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundData = {
      notes: {
        reason: reason
      }
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to paise
    }

    const razorpayInstance = initializeRazorpay();
    const refund = await razorpayInstance.payments.refund(razorpayPaymentId, refundData);

    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert back to rupees
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000)
      }
    };

  } catch (error) {
    console.error('Refund payment error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  processSuccessfulPayment,
  processFailedPayment,
  getPaymentDetails,
  getUserPaymentHistory,
  createRazorpayCustomer,
  refundPayment
};
