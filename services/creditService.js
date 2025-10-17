const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');

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

// Check if user has enough credits
const checkCredits = async (userId, requiredCredits = 1) => {
  try {
    // First check and reset daily credits if needed
    const resetResult = await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      hasEnoughCredits: user.credits >= requiredCredits,
      currentCredits: user.credits,
      requiredCredits,
      resetInfo: resetResult
    };

  } catch (error) {
    console.error('Check credits error:', error);
    throw error;
  }
};

// Consume credits for image generation
const consumeCredits = async (userId, creditsToConsume = 1, reason = 'image_generation', relatedImageId = null) => {
  try {
    // First check and reset daily credits if needed
    await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.credits < creditsToConsume) {
      throw new Error('Insufficient credits');
    }

    const balanceBefore = user.credits;

    // Deduct credits
    user.credits -= creditsToConsume;
    user.totalCreditsUsed += creditsToConsume;
    await user.save();

    // Create transaction record
    await CreditTransaction.create({
      userId,
      type: 'consume',
      amount: creditsToConsume,
      balanceBefore,
      balanceAfter: user.credits,
      reason,
      description: `Credits consumed for ${reason.replace('_', ' ')}`,
      relatedImageId,
      status: 'completed'
    });

    console.log(`Credits consumed for user ${userId}: ${creditsToConsume} credits. Remaining: ${user.credits}`);

    return {
      success: true,
      creditsConsumed: creditsToConsume,
      remainingCredits: user.credits,
      totalCreditsUsed: user.totalCreditsUsed
    };

  } catch (error) {
    console.error('Consume credits error:', error);
    throw error;
  }
};

// Add credits (for payment integration later)
const addCredits = async (userId, creditsToAdd, reason = 'manual_add', adminId = null, metadata = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.credits;

    user.credits += creditsToAdd;
    user.totalCreditsAdded += creditsToAdd;
    await user.save();

    // Create transaction record
    await CreditTransaction.create({
      userId,
      type: 'add',
      amount: creditsToAdd,
      balanceBefore,
      balanceAfter: user.credits,
      reason,
      description: `Credits added - ${reason.replace('_', ' ')}`,
      adminId,
      metadata,
      status: 'completed'
    });

    console.log(`Credits added for user ${userId}: ${creditsToAdd} credits. Total: ${user.credits}. Reason: ${reason}`);

    return {
      success: true,
      creditsAdded: creditsToAdd,
      totalCredits: user.credits,
      totalCreditsAdded: user.totalCreditsAdded,
      reason
    };

  } catch (error) {
    console.error('Add credits error:', error);
    throw error;
  }
};

// Get user credit info
const getCreditInfo = async (userId) => {
  try {
    // First check and reset daily credits if needed
    const resetResult = await checkAndResetDailyCredits(userId);
    
    const user = await User.findById(userId).select('credits lastCreditReset totalCreditsUsed totalCreditsAdded createdAt');
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const lastReset = new Date(user.lastCreditReset);
    const hoursUntilReset = Math.ceil(24 - ((now - lastReset) / (1000 * 60 * 60)));

    return {
      currentCredits: user.credits,
      lastCreditReset: user.lastCreditReset,
      hoursUntilNextReset: Math.max(0, hoursUntilReset),
      totalCreditsUsed: user.totalCreditsUsed,
      totalCreditsAdded: user.totalCreditsAdded,
      dailyLimit: 3,
      resetInfo: resetResult
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
  checkCredits,
  consumeCredits,
  addCredits,
  getCreditInfo,
  requireCredits
};
