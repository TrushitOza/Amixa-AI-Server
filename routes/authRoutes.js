const express = require('express');
const {
  register,
  login,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
  resetPassword,
  editUser,
  logout,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/resend-email-otp', resendEmailOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password-otp', resetPasswordWithOtp);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);

router.use(protect);

router.get('/me', getMe);
router.put('/edit-user', editUser);

module.exports = router;
