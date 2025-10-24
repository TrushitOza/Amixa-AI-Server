const {
  createPaymentOrder,
  processSuccessfulPayment,
  processFailedPayment,
  getPaymentDetails,
  getUserPaymentHistory,
  createRazorpayCustomer
} = require('../services/paymentService');
const PricingPlan = require('../models/PricingPlan');
const PaymentOrder = require('../models/PaymentOrder');

// Get all available pricing plans
const getPricingPlans = async (req, res) => {
  try {
    const { planType } = req.query;

    const plans = await PricingPlan.getActivePlans(planType);

    res.status(200).json({
      success: true,
      message: 'Pricing plans retrieved successfully',
      data: {
        plans: plans.map(plan => ({
          id: plan._id,
          name: plan.name,
          displayName: plan.displayName,
          description: plan.description,
          planType: plan.planType,
          credits: plan.credits,
          price: plan.price,
          currency: plan.currency,
          features: plan.features,
          validityDays: plan.validityDays,
          rolloverCredits: plan.rolloverCredits,
          metadata: plan.metadata
        }))
      }
    });

  } catch (error) {
    console.error('Get pricing plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pricing plans',
      error: error.message
    });
  }
};

// Create payment order for plan purchase
const createOrder = async (req, res) => {
  try {
    const { planName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!planName) {
      return res.status(400).json({
        success: false,
        message: 'Plan name is required'
      });
    }

    // Get client metadata
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceInfo: req.get('X-Device-Info') || 'unknown'
    };

    const orderResult = await createPaymentOrder(userId, planName, metadata);

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: orderResult
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify and process payment
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters'
      });
    }

    const result = await processSuccessfulPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method
    );

    if (result.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          alreadyProcessed: true
        }
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        credits: result.credits,
        plan: result.plan,
        totalCredits: result.totalCredits
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Handle payment failure
const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, failure_reason } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    await processFailedPayment(razorpay_order_id, failure_reason);

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded'
    });

  } catch (error) {
    console.error('Handle payment failure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
      error: error.message
    });
  }
};

// Get payment order details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const result = await getPaymentDetails(orderId);

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: result.payment
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      error: error.message
    });
  }
};

// Get user's payment history
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      page = 1,
      limit = 20,
      status,
      planType,
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
      status,
      planType,
      startDate,
      endDate
    };

    const result = await getUserPaymentHistory(userId, options);

    res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history',
      error: error.message
    });
  }
};

// Create Razorpay customer for subscriptions
const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await createRazorpayCustomer(userId);

    res.status(200).json({
      success: true,
      message: result.existing ? 'Customer already exists' : 'Customer created successfully',
      data: {
        customerId: result.customerId,
        existing: result.existing
      }
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
};

// Webhook handler for Razorpay events
const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.get('X-Razorpay-Signature');
    const webhookBody = req.body;

    // Verify webhook signature (implement based on Razorpay documentation)
    // const isValidWebhook = verifyWebhookSignature(webhookBody, webhookSignature);
    // if (!isValidWebhook) {
    //   return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    // }

    const { event, payload } = webhookBody;

    switch (event) {
      case 'payment.captured':
        // Handle successful payment
        await processSuccessfulPayment(
          payload.payment.entity.order_id,
          payload.payment.entity.id,
          null, // Signature not needed for webhook
          payload.payment.entity.method
        );
        break;

      case 'order.paid':
        // Handle order paid event
        await processSuccessfulPayment(
          payload.order.entity.id,
          payload.payment.entity.id,
          null, // Signature not needed for webhook
          payload.payment.entity.method
        );
        break;

      case 'payment.failed':
        // Handle failed payment
        await processFailedPayment(
          payload.payment.entity.order_id,
          payload.payment.entity.error_description
        );
        break;

      case 'subscription.charged':
        // Handle subscription renewal
        console.log('Subscription charged:', payload);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// Get payment configuration (for frontend)
const getPaymentConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Payment configuration retrieved successfully',
      data: {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        currency: 'INR',
        supportedMethods: ['upi', 'card', 'netbanking', 'wallet'],
        upiApps: ['gpay', 'phonepe', 'paytm', 'bhim']
      }
    });

  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment configuration',
      error: error.message
    });
  }
};

module.exports = {
  getPricingPlans,
  createOrder,
  verifyPayment,
  handlePaymentFailure,
  getOrderDetails,
  getPaymentHistory,
  createCustomer,
  handleWebhook,
  getPaymentConfig
};
