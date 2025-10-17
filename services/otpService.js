const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate OTP expiration time (10 minutes from now)
const generateOtpExpiration = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// Send registration OTP email
const sendRegistrationOtp = async (email, otp, firstname) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Email Verification - Amixa AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Amixa AI, ${firstname}!</h2>
          <p>Thank you for registering with us. Please verify your email address to complete your registration.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="color: #007bff; margin: 0;">Your Verification Code</h3>
            <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
          </div>
          <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send OTP email' };
  }
};

// Send password reset OTP email
const sendPasswordResetOtp = async (email, otp, firstname) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Password Reset - Amixa AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${firstname},</p>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="color: #dc3545; margin: 0;">Your Reset Code</h3>
            <h1 style="color: #dc3545; font-size: 32px; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
          </div>
          <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Reset OTP sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send reset OTP email' };
  }
};

// Verify OTP and check expiration
const verifyOtp = (providedOtp, storedOtp, otpExpiration) => {
  if (!storedOtp || !otpExpiration) {
    return { valid: false, message: 'No OTP found' };
  }

  if (new Date() > otpExpiration) {
    return { valid: false, message: 'OTP has expired' };
  }

  if (providedOtp !== storedOtp) {
    return { valid: false, message: 'Invalid OTP' };
  }

  return { valid: true, message: 'OTP verified successfully' };
};

// Clean up expired OTPs from user document
const cleanupUserOtps = (user, otpType = 'both') => {
  if (otpType === 'email' || otpType === 'both') {
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
  }
  
  if (otpType === 'password' || otpType === 'both') {
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
  }
};

// Check if OTP attempts should be rate limited
const checkOtpRateLimit = (lastOtpSent, cooldownMinutes = 1) => {
  if (!lastOtpSent) return { allowed: true };
  
  const timeDiff = Date.now() - lastOtpSent.getTime();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  if (timeDiff < cooldownMs) {
    const remainingTime = Math.ceil((cooldownMs - timeDiff) / 1000);
    return { 
      allowed: false, 
      message: `Please wait ${remainingTime} seconds before requesting another OTP` 
    };
  }
  
  return { allowed: true };
};

module.exports = {
  generateOtp,
  generateOtpExpiration,
  sendRegistrationOtp,
  sendPasswordResetOtp,
  verifyOtp,
  cleanupUserOtps,
  checkOtpRateLimit
};
