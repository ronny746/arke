const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email with a 6-digit OTP
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP
 */
exports.sendEmailOTP = async (to, otp) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP credentials are not configured in environment variables.');
    return { success: false, message: 'Email service is not configured' };
  }

  const mailOptions = {
    from: `"SKD Xpress" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your Login Verification Code - SKD Xpress',
    text: `Hello,\n\nYour One-Time Password (OTP) for logging into your SKD Xpress account is: ${otp}\n\nThis OTP is valid for 10 minutes. Please do not share it with anyone.\n\nIf you didn't request this, you can safely ignore this email.\n\nThank you,\nSKD Xpress Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #0033a0; text-align: center;">SKD Xpress Login</h2>
        <p style="color: #374151; font-size: 16px;">Hello,</p>
        <p style="color: #374151; font-size: 16px;">Your One-Time Password (OTP) for logging into your account is:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <h1 style="color: #111827; margin: 0; letter-spacing: 4px; font-size: 32px;">${otp}</h1>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  // LOG OTP TO TERMINAL SO USER CAN SEE IT
  console.log(`\n\n=========================================\n🔥 OTP FOR ${to} IS: ${otp} 🔥\n=========================================\n\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP Email:', error);
    return { success: false, message: error.message };
  }
};
