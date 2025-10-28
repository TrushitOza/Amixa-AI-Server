const express = require('express');
const {
  getPricingPlans,
  createOrder,
  verifyPayment,
  handlePaymentFailure,
  getOrderDetails,
  getPaymentHistory,
  createCustomer,
  handleWebhook,
  getPaymentConfig
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/plans', getPricingPlans);
router.get('/config', getPaymentConfig);
router.post('/webhook', handleWebhook); // Webhook should not require auth

// Protected routes (require authentication)
router.use(protect);

// Payment order management
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/failure', handlePaymentFailure);
router.get('/order/:orderId', getOrderDetails);

// User payment history
router.get('/history', getPaymentHistory);

// Customer management
router.post('/create-customer', createCustomer);

module.exports = router;
