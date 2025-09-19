import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use App Password for Gmail
      },
    });
  }

  // For other email services or SMTP
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

// Send verification email
export const sendVerificationEmail = async (
  email,
  verificationToken,
  userFullName
) => {
  try {
    const transporter = createTransporter();

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${verificationToken}`;

    const mailOptions = {
      from: {
        name: 'Samudra Sahayak',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: 'Verify Your Samudra Sahayak Account',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #3b82f6, #06b6d4);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f8fafc;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #e2e8f0;
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background: #2563eb;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .security-note {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🌊 Samudra Sahayak</div>
            <h1>Welcome to Samudra Sahayak!</h1>
            <p>Keeping coastal communities safe together</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userFullName}!</h2>
            
            <p>Thank you for joining Samudra Sahayak, the community-driven platform for coastal emergency management and ocean hazard reporting.</p>
            
            <p>To complete your registration and start helping make coastal communities safer, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Account</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${verificationUrl}
            </p>
            
            <div class="security-note">
              <strong>🔐 Security Note:</strong> This verification link will expire in 24 hours for your security. If you didn't create this account, please ignore this email.
            </div>
            
            <h3>What you can do with Samudra Sahayak:</h3>
            <ul>
              <li>📱 Report ocean hazards and emergencies</li>
              <li>🚨 Receive real-time alerts for your area</li>
              <li>👥 Connect with local emergency responders</li>
              <li>📊 Access community safety resources</li>
              <li>🌊 Help keep coastal communities informed and safe</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Stay safe!<br>
            <strong>The Samudra Sahayak Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>© 2025 Samudra Sahayak. All rights reserved.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Samudra Sahayak!
        
        Hello ${userFullName}!
        
        Thank you for joining Samudra Sahayak. To complete your registration, please verify your email address by visiting:
        
        ${verificationUrl}
        
        This link will expire in 24 hours for security reasons.
        
        If you didn't create this account, please ignore this email.
        
        Best regards,
        The Samudra Sahayak Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email,
  resetToken,
  userFullName
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Samudra Sahayak',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: 'Reset Your Samudra Sahayak Password',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #ef4444, #f97316);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f8fafc;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #e2e8f0;
            }
            .token-box {
              background: #1e293b;
              color: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              font-family: 'Courier New', monospace;
              font-size: 16px;
              font-weight: bold;
              letter-spacing: 1px;
              text-align: center;
              margin: 20px 0;
              border: 2px solid #ef4444;
            }
            .security-warning {
              background: #fef2f2;
              border: 1px solid #ef4444;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Password Reset Token</h1>
            <p>Samudra Sahayak Account Recovery</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userFullName}!</h2>
            
            <p>We received a request to reset the password for your Samudra Sahayak account.</p>
            
            <p>Here is your password reset token. Please copy and use this token to reset your password:</p>
            
            <div class="token-box">
              ${resetToken}
            </div>
            
            <div class="security-warning">
              <strong>⚠️ Security Instructions:</strong>
              <ul>
                <li>Copy the token above and use it in the password reset form</li>
                <li>This token will expire in 1 hour for your security</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your current password remains unchanged until you create a new one</li>
                <li>Do not share this token with anyone</li>
              </ul>
            </div>
            
            <p>If you continue to have problems, please contact our support team.</p>
            
            <p>Stay secure!<br>
            <strong>The Samudra Sahayak Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>© 2025 Samudra Sahayak. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (email, userFullName, userRole) => {
  try {
    const transporter = createTransporter();

    const roleSpecificContent =
      userRole === 'official'
        ? `
        <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>🏛️ Official Account Notice:</strong>
          <p>Your official account is pending verification. Our team will review your credentials and approve your account within 24-48 hours. You'll receive an email once approved.</p>
        </div>
      `
        : '';

    const mailOptions = {
      from: {
        name: 'Samudra Sahayak',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: 'Welcome to Samudra Sahayak - Account Verified!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Samudra Sahayak</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f8fafc;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #e2e8f0;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .feature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .feature-item {
              background: white;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Welcome to Samudra Sahayak!</h1>
            <p>Your account has been successfully verified</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userFullName}!</h2>
            
            <p>Congratulations! Your Samudra Sahayak account has been successfully verified. You're now part of a community dedicated to coastal safety and emergency response.</p>
            
            ${roleSpecificContent}
            
            <h3>🚀 Get Started:</h3>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <h3>🌊 What you can do now:</h3>
            <div class="feature-grid">
              <div class="feature-item">
                <strong>📱 Report Incidents</strong><br>
                Quickly report ocean hazards and emergencies
              </div>
              <div class="feature-item">
                <strong>🚨 Get Alerts</strong><br>
                Receive real-time safety alerts for your area
              </div>
              <div class="feature-item">
                <strong>📍 Track Activities</strong><br>
                Monitor emergency response activities
              </div>
              <div class="feature-item">
                <strong>👥 Community Connect</strong><br>
                Connect with local responders and citizens
              </div>
            </div>
            
            <h3>📖 Quick Tips:</h3>
            <ul>
              <li><strong>Update your profile:</strong> Add your location for better local alerts</li>
              <li><strong>Set up notifications:</strong> Customize your alert preferences</li>
              <li><strong>Explore the map:</strong> See real-time incidents in your area</li>
              <li><strong>Join the community:</strong> Follow and contribute to safety discussions</li>
            </ul>
            
            <p>If you have any questions or need help getting started, our support team is here to assist you.</p>
            
            <p>Thank you for joining our mission to keep coastal communities safe!</p>
            
            <p>Best regards,<br>
            <strong>The Samudra Sahayak Team</strong></p>
          </div>
          
          <div class="footer">
            <p>Need help? Contact us at support@samudrasahayak.org</p>
            <p>© 2025 Samudra Sahayak. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};
