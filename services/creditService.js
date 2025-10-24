const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');

// Helper function to update maxCredits based on current capacity
const updateMaxCredits = (user) => {
  // For active plans: maxCredits = daily + plan credits
  // For free users: maxCredits = 3 (daily limit)
  if (user.isSubscriptionActive && user.planCredits > 0) {
    user.maxCredits = user.credits + user.planCredits;
  } else {
    user.maxCredits = 3; // Daily limit for free users
  }
};

// Check if user needs daily credit reset
const checkAndResetDailyCredits = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const lastReset = new Date(user.lastCreditReset);
    
    // Check if it's a new day (24 hours have passed)
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      // Reset credits to 3 for new day
      const balanceBefore = user.credits;
      user.credits = 3;
      user.lastCreditReset = now;
      
      // Update maxCredits based on current capacity
      updateMaxCredits(user);
      
      await user.save();

      // Create transaction record for daily reset
      await CreditTransaction.create({
        userId,
        type: 'reset',
        amount: 3 - balanceBefore,
        balanceBefore,
        balanceAfter: 3,
        reason: 'daily_reset',
        description: 'Daily credit reset - 3 credits restored',
        status: 'completed'
      });
      
      console.log(`Daily credits reset for user ${userId}: 3 credits restored`);
      return {
        reset: true,
        credits: 3,
        message: 'Daily credits restored!'
      };
    }

    return {
      reset: false,
      credits: user.credits,
      hoursUntilReset: Math.ceil(24 - hoursSinceReset)
    };

  } catch (error) {
    console.error('Credit reset error:', error);
    throw error;
  }
};

// Check if user's plan is expired
const checkPlanExpiry = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    
    // If user has no plan or plan end date
    if (!user.planEndDate || user.currentPlan === 'free') {
      return {
        isActive: false,
        isExpired: false,
        planName: 'free',
        daysRemaining: 0
      };
    }

    const planEndDate = new Date(user.planEndDate);
    const isExpired = now > planEndDate;
    const daysRemaining = Math.max(0, Math.ceil((planEndDate - now) / (1000 * 60 * 60 * 24)));

    // If plan is expired, deactivate it
    if (isExpired && user.isSubscriptionActive) {
      user.isSubscriptionActive = false;
      user.currentPlan = 'free';
      user.planCredits = 0; // Remove remaining plan credits
      updateMaxCredits(user); // Reset maxCredits based on new status
      await user.save();

      // Create transaction record for plan expiry
      await CreditTransaction.create({
        userId,
        type: 'consume',
        amount: user.planCredits,
        balanceBefore: user.planCredits,
        balanceAfter: 0,
        reason: 'plan_expiry_deduction',
        description: 'Plan expired - remaining credits removed',
        status: 'completed'
      });
    }

    return {
      isActive: !isExpired && user.isSubscriptionActive,
      isExpired,
      planName: user.currentPlan,
      planType: user.planType,
      daysRemaining,
      nextBillingDate: user.nextBillingDate
    };

  } catch (error) {
    console.error('Check plan expiry error:', error);
    throw error;
  }
};

// Check if user has enough credits (including plan credits)
const checkCredits = async (userId, requiredCredits = 1) => {
  try {
    // First check and reset daily credits if needed
    const resetResult = await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if plan is expired
    const planStatus = await checkPlanExpiry(userId);
    
    // Calculate total available credits
    const dailyCredits = user.credits;
    const planCredits = planStatus.isActive ? user.planCredits : 0;
    const totalCredits = dailyCredits + planCredits;

    return {
      hasEnoughCredits: totalCredits >= requiredCredits,
      currentCredits: totalCredits,
      dailyCredits,
      planCredits,
      requiredCredits,
      resetInfo: resetResult,
      planStatus
    };

  } catch (error) {
    console.error('Check credits error:', error);
    throw error;
  }
};

// Consume credits for image generation (prioritize plan credits first)
const consumeCredits = async (userId, creditsToConsume = 1, reason = 'image_generation', relatedImageId = null) => {
  try {
    // First check and reset daily credits if needed
    await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check plan expiry
    const planStatus = await checkPlanExpiry(userId);
    
    // Calculate available credits
    const dailyCredits = user.credits;
    const planCredits = planStatus.isActive ? user.planCredits : 0;
    const totalCredits = dailyCredits + planCredits;

    if (totalCredits < creditsToConsume) {
      throw new Error('Insufficient credits');
    }

    let remainingToConsume = creditsToConsume;
    let consumedFromPlan = 0;
    let consumedFromDaily = 0;

    // First consume from plan credits
    if (planCredits > 0 && remainingToConsume > 0) {
      consumedFromPlan = Math.min(planCredits, remainingToConsume);
      user.planCredits -= consumedFromPlan;
      remainingToConsume -= consumedFromPlan;
    }

    // Then consume from daily credits if needed
    if (remainingToConsume > 0) {
      consumedFromDaily = remainingToConsume;
      user.credits -= consumedFromDaily;
    }

    user.totalCreditsUsed += creditsToConsume;
    await user.save();

    // Create transaction record
    await CreditTransaction.create({
      userId,
      type: 'consume',
      amount: creditsToConsume,
      balanceBefore: totalCredits,
      balanceAfter: user.credits + user.planCredits,
      reason,
      description: `Credits consumed for ${reason.replace('_', ' ')} (Plan: ${consumedFromPlan}, Daily: ${consumedFromDaily})`,
      relatedImageId,
      status: 'completed',
      metadata: {
        consumedFromPlan,
        consumedFromDaily,
        planActive: planStatus.isActive
      }
    });

    console.log(`Credits consumed for user ${userId}: ${creditsToConsume} credits (Plan: ${consumedFromPlan}, Daily: ${consumedFromDaily}). Remaining: ${user.credits + user.planCredits}`);

    return {
      success: true,
      creditsConsumed: creditsToConsume,
      consumedFromPlan,
      consumedFromDaily,
      remainingCredits: user.credits + user.planCredits,
      remainingDailyCredits: user.credits,
      remainingPlanCredits: user.planCredits,
      totalCreditsUsed: user.totalCreditsUsed
    };

  } catch (error) {
    console.error('Consume credits error:', error);
    throw error;
  }
};

// Add credits (for payment integration and plan purchases)
const addCredits = async (userId, creditsToAdd, reason = 'manual_add', adminId = null, metadata = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.credits + user.planCredits;

    // For plan purchases, add to planCredits; for manual/admin adds, add to regular credits
    if (reason === 'plan_purchase' || reason === 'subscription_renewal') {
      user.planCredits += creditsToAdd;
    } else {
      user.credits += creditsToAdd;
    }
    
    user.totalCreditsAdded += creditsToAdd;
    
    // Update maxCredits based on current capacity
    updateMaxCredits(user);
    
    await user.save();

    // Create transaction record
    await CreditTransaction.create({
      userId,
      type: 'add',
      amount: creditsToAdd,
      balanceBefore,
      balanceAfter: user.credits + user.planCredits,
      reason,
      description: `Credits added - ${reason.replace('_', ' ')}`,
      adminId,
      metadata,
      status: 'completed'
    });

    console.log(`Credits added for user ${userId}: ${creditsToAdd} credits. Total: ${user.credits + user.planCredits}. Reason: ${reason}`);

    return {
      success: true,
      creditsAdded: creditsToAdd,
      totalCredits: user.credits + user.planCredits,
      dailyCredits: user.credits,
      planCredits: user.planCredits,
      totalCreditsAdded: user.totalCreditsAdded,
      reason
    };

  } catch (error) {
    console.error('Add credits error:', error);
    throw error;
  }
};

// Get user credit info (including plan credits)
const getCreditInfo = async (userId) => {
  try {
    // First check and reset daily credits if needed
    const resetResult = await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId).select('credits planCredits maxCredits lastCreditReset totalCreditsUsed totalCreditsAdded currentPlan planType planEndDate nextBillingDate isSubscriptionActive createdAt');
    if (!user) {
      throw new Error('User not found');
    }

    // Check plan status
    const planStatus = await checkPlanExpiry(userId);

    const now = new Date();
    const lastReset = new Date(user.lastCreditReset);
    const hoursUntilReset = Math.ceil(24 - ((now - lastReset) / (1000 * 60 * 60)));

    return {
      dailyCredits: user.credits,
      planCredits: planStatus.isActive ? user.planCredits : 0,
      totalCredits: user.credits + (planStatus.isActive ? user.planCredits : 0),
      maxCredits: user.maxCredits || 3, // Use stored maxCredits or default to 3
      lastCreditReset: user.lastCreditReset,
      hoursUntilNextReset: Math.max(0, hoursUntilReset),
      totalCreditsUsed: user.totalCreditsUsed,
      totalCreditsAdded: user.totalCreditsAdded,
      dailyLimit: 3,
      resetInfo: resetResult,
      plan: {
        current: user.currentPlan,
        type: user.planType,
        isActive: planStatus.isActive,
        endDate: user.planEndDate,
        nextBillingDate: user.nextBillingDate,
        daysRemaining: planStatus.daysRemaining
      }
    };

  } catch (error) {
    console.error('Get credit info error:', error);
    throw error;
  }
};

// Credit middleware to check before image generation
const requireCredits = (creditsRequired = 1) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const creditCheck = await checkCredits(userId, creditsRequired);
      
      if (!creditCheck.hasEnoughCredits) {
        const hoursUntilReset = creditCheck.resetInfo.hoursUntilReset || 0;
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient credits',
          data: {
            currentCredits: creditCheck.currentCredits,
            requiredCredits: creditsRequired,
            hoursUntilReset,
            dailyLimit: 3
          }
        });
      }

      // Store credit info in request for use in controller
      req.creditInfo = creditCheck;
      next();

    } catch (error) {
      console.error('Credit middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Credit system error',
        error: error.message
      });
    }
  };
};

module.exports = {
  checkAndResetDailyCredits,
  checkPlanExpiry,
  checkCredits,
  consumeCredits,
  addCredits,
  getCreditInfo,
  requireCredits
};
