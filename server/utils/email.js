const nodemailer = require('nodemailer');

// Create transporter (same as swin-server)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL_USER,
    pass: process.env.NODEMAILER_APP_PASSWORD,
  },
});

// Email templates
const getInviteEmailTemplate = (name, token, companyName = 'Teambo') => {
  // Create both web fallback and deep link
  const webUrl = `${process.env.ADMIN_URL}/invite?token=${token}`;
  const deepLink = `tmbc://register?token=${token}`;
  // Use API redirect URL for email compatibility (email clients don't handle custom schemes well)
  // This URL will redirect to the deep link, working better in email clients
  const serverUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const redirectUrl = `${serverUrl}/api/employees/invite/${token}`;
  // Use tokenHash for the short code (first 8 chars of hashed token)
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const shortCode = tokenHash.substring(0, 8).toUpperCase();

  return {
    subject: `Complete signup for ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Signup</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .code { background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to ${companyName}!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>You've been invited to join ${companyName} as part of our team. To complete your account setup, please use one of the methods below:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${webUrl}" class="button" style="display: inline-block; margin: 10px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Signup (Web)</a>
          </div>
          
          <div class="warning">
            <strong>For Mobile App Users:</strong> If you have the Teambo mobile app installed, click the button below to open the app directly:
            <div style="text-align: center; margin: 20px 0;">
              <a href="${redirectUrl}" class="button" style="display: inline-block; margin: 10px; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Open in Mobile App</a>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 10px; text-align: center;">
              Note: This will only work if the Teambo app is installed on your device. If the app doesn't open, you can use the web option above.
            </p>
          </div>
          
          <div class="warning">
            <strong>Alternative Method:</strong> You can also manually enter this code in the mobile app:
            <div class="code">${shortCode}</div>
          </div>
          
          <p><strong>Important:</strong></p>
          <ul>
            <li>This invitation will expire in 7 days</li>
            <li>Please complete your signup as soon as possible</li>
            <li>If you didn't expect this invitation, please contact support</li>
          </ul>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${companyName}. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to ${companyName}!
      
      Hello ${name}!
      
      You've been invited to join ${companyName} as part of our team. To complete your account setup, please use one of the methods below:
      
      OPTION 1 - Web Browser:
      ${webUrl}
      
      OPTION 2 - Mobile App (if you have the Teambo app installed):
      ${deepLink}
      
      OPTION 3 - Manual Code Entry:
      Enter this code in the mobile app: ${shortCode}
      
      Important:
      - This invitation will expire in 7 days
      - Please complete your signup as soon as possible
      - If you didn't expect this invitation, please contact support
      
      If you have any questions, please don't hesitate to contact our support team.
      
      This is an automated message from ${companyName}. Please do not reply to this email.
      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `
  };
};

// Email template for OTP
const getOTPEmailTemplate = (name, otp, companyName = 'Teambo') => {
  return {
    subject: `Your Verification Code - ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background: #e5e7eb; padding: 20px; border-radius: 6px; font-family: monospace; font-size: 32px; text-align: center; margin: 20px 0; font-weight: bold; letter-spacing: 8px; border: 2px solid #9ca3af; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .info { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your Verification Code</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>You've requested a verification code. Please use the code below to verify your identity:</p>
          
          <div class="otp-box">
            ${otp}
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code will expire in 10 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>Our team will never ask for this code</li>
              <li>If you did not request this code, please ignore this email or contact support</li>
            </ul>
          </div>
          
          <div class="info">
            <strong>📱 How to Use:</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Enter the 4-digit code shown above</li>
              <li>Complete your verification process</li>
              <li>If the code expires, you can request a new one</li>
            </ol>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${companyName}. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Your Verification Code - ${companyName}
      
      Hello ${name}!
      
      You've requested a verification code. Please use the code below to verify your identity:
      
      VERIFICATION CODE: ${otp}
      
      ⚠️ Security Notice:
      - This code will expire in 10 minutes
      - Do not share this code with anyone
      - Our team will never ask for this code
      - If you did not request this code, please ignore this email or contact support
      
      📱 How to Use:
      1. Enter the 4-digit code shown above
      2. Complete your verification process
      3. If the code expires, you can request a new one
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
      
      This is an automated message from ${companyName}. Please do not reply to this email.
      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `
  };
};

// Send invitation email (same pattern as swin-server)
const sendInviteEmail = async (email, token, name) => {
  try {
    const template = getInviteEmailTemplate(name, token);

    const mailOptions = {
      from: {
        name: process.env.COMPANY_NAME || 'Teambo',
        address: process.env.NODEMAILER_EMAIL_USER,
      },
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  try {
    const template = getOTPEmailTemplate(name, otp);

    const mailOptions = {
      from: {
        name: process.env.COMPANY_NAME || 'Teambo',
        address: process.env.NODEMAILER_EMAIL_USER,
      },
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send test email (same pattern as swin-server)
const sendTestEmail = async (email) => {
  try {
    const mailOptions = {
      from: {
        name: process.env.COMPANY_NAME || 'Teambo',
        address: process.env.NODEMAILER_EMAIL_USER,
      },
      to: email,
      subject: 'Test Email from Teambo Admin',
      text: 'This is a test email to verify email configuration.',
      html: '<p>This is a test email to verify email configuration.</p>'
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};

module.exports = {
  sendInviteEmail,
  sendOTPEmail,
  sendTestEmail
};



