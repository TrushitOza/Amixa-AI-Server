# OTP Authentication Flow Documentation

## Overview
This document describes the OTP-based authentication system for registration and password reset flows.

## Registration Flow

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration initiated. Please check your email for verification code.",
  "userId": "user_id_here"
}
```

### 2. Verify Email OTP
**Endpoint:** `POST /api/auth/verify-email-otp`

**Request Body:**
```json
{
  "userId": "user_id_here",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com"
  }
}
```

### 3. Resend Email OTP
**Endpoint:** `POST /api/auth/resend-email-otp`

**Request Body:**
```json
{
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

## Login Flow

### User Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Success Response (Verified User):**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com"
  }
}
```

**Response (Unverified User):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "requiresVerification": true,
  "userId": "user_id_here"
}
```

## Forgot Password Flow

### 1. Request Password Reset
**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset code sent to your email",
  "userId": "user_id_here"
}
```

### 2. Verify Reset OTP
**Endpoint:** `POST /api/auth/verify-reset-otp`

**Request Body:**
```json
{
  "userId": "user_id_here",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password.",
  "canResetPassword": true
}
```

### 3. Reset Password with OTP
**Endpoint:** `POST /api/auth/reset-password-otp`

**Request Body:**
```json
{
  "userId": "user_id_here",
  "otp": "123456",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Security Features

### OTP Specifications
- **Length:** 6 digits
- **Expiration:** 10 minutes
- **Rate Limiting:** 1 minute cooldown between requests
- **Single Use:** OTPs are cleared after successful verification

### Email Templates
- **Registration:** Welcome message with verification code
- **Password Reset:** Security-focused reset code email
- **HTML Formatted:** Professional email templates with clear instructions

### Error Handling
- Invalid OTP
- Expired OTP
- Rate limiting
- User not found
- Email already verified
- Network/email sending errors

## Frontend Integration Guide

### Registration Flow
1. User submits registration form
2. Show "Check your email" message with userId
3. Display OTP input form
4. On successful verification, redirect to dashboard
5. Provide "Resend OTP" option with rate limiting

### Login Flow
1. User submits login form
2. If `requiresVerification: true`, show OTP verification form
3. Use stored userId for OTP verification
4. On success, proceed to dashboard

### Password Reset Flow
1. User submits email for password reset
2. Show "Check your email" message with userId
3. Display OTP verification form
4. After OTP verification, show password reset form
5. Include OTP in password reset request

## Environment Variables Required

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_NAME=Amixa AI
FROM_EMAIL=noreply@amixa-ai.com
```

## Database Schema Changes

### User Model Updates
```javascript
{
  // Existing fields...
  isEmailVerified: { type: Boolean, default: false },
  emailOtp: String,
  emailOtpExpires: Date,
  lastOtpSent: Date,
  passwordResetOtp: String,
  passwordResetOtpExpires: Date
}
```

## Testing Endpoints

Use tools like Postman or curl to test the endpoints. Make sure to:
1. Configure email settings in `.env` file
2. Test with real email addresses
3. Check email delivery and OTP codes
4. Verify rate limiting works
5. Test OTP expiration

## Common Issues & Solutions

### Email Not Sending
- Check SMTP credentials
- Verify email provider settings
- Check firewall/network restrictions
- Enable "Less secure app access" for Gmail

### OTP Not Working
- Verify OTP hasn't expired (10 minutes)
- Check for typos in OTP entry
- Ensure userId matches the user
- Check database for OTP storage

### Rate Limiting Issues
- Wait for cooldown period (1 minute)
- Check `lastOtpSent` field in database
- Adjust cooldown in `otpService.js` if needed
