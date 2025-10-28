const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Initialize SendGrid
const initializeSendGrid = () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not found. Falling back to SMTP.');
    return false;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return true;
};

// Create email transporter (fallback to SMTP if SendGrid not available)
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

// Send email using SendGrid or fallback to SMTP
const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Try SendGrid first
    if (initializeSendGrid()) {
      const msg = {
        to: to,
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME || 'Amixa AI'
        },
        subject: subject,
        html: htmlContent
      };

      await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid');
      return { success: true, message: 'Email sent successfully via SendGrid' };
    } else {
      // Fallback to SMTP
      const transporter = createTransporter();
      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'Amixa AI'}" <${process.env.FROM_EMAIL}>`,
        to: to,
        subject: subject,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully via SMTP');
      return { success: true, message: 'Email sent successfully via SMTP' };
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

// Send registration OTP email
const sendRegistrationOtp = async (email, otp, firstname) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007bff; margin: 0;">Amixa AI</h1>
      </div>
      
      <h2 style="color: #333; margin-bottom: 20px;">Welcome to Amixa AI, ${firstname}!</h2>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
        Thank you for registering with us. Please verify your email address to complete your registration.
      </p>
      
      <div style="background: linear-gradient(135deg, #007bff, #0056b3); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">Your Verification Code</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; display: inline-block;">
          <h1 style="color: #007bff; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
        </div>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #856404; margin: 0; font-weight: 500;">
          <strong>⚠️ Important:</strong> This code will expire in 10 minutes.
        </p>
      </div>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 30px;">
        If you didn't create an account with us, please ignore this email and no further action is required.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <div style="text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated message from Amixa AI. Please do not reply to this email.
        </p>
        <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
          © 2024 Amixa AI. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return await sendEmail(email, 'Email Verification - Amixa AI', htmlContent);
};

// Send password reset OTP email
const sendPasswordResetOtp = async (email, otp, firstname) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc3545; margin: 0;">Amixa AI</h1>
      </div>
      
      <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
        Hello ${firstname},
      </p>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
        We received a request to reset your password for your Amixa AI account. Use the verification code below to proceed with resetting your password.
      </p>
      
      <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">Your Password Reset Code</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; display: inline-block;">
          <h1 style="color: #dc3545; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
        </div>
      </div>
      
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #721c24; margin: 0; font-weight: 500;">
          <strong>⚠️ Important:</strong> This code will expire in 10 minutes for security reasons.
        </p>
      </div>
      
      <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #0c5460; margin: 0;">
          <strong>🔒 Security Notice:</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged. Consider reviewing your account security if you receive this unexpectedly.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <div style="text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated security message from Amixa AI. Please do not reply to this email.
        </p>
        <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
          © 2024 Amixa AI. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return await sendEmail(email, 'Password Reset - Amixa AI', htmlContent);
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
