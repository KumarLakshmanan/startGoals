import nodemailer from "nodemailer";
import twilio from "twilio";
import dotenv from "dotenv";
import Otp from "../model/otp.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { generateOtp } from "./commonUtils.js";

dotenv.config();

const OTP_EXPIRY_MINUTES = 5;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

// export async function sendEmailOtp(to, otp) {
//   await transporter.sendMail({
//     from: `"START GOALS" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: "Your OTP Code",
//     html: `<p>Your OTP code is: <b>${otp}</b>. It expires in 5 minutes.</p>`,
//   });
// }

export async function sendEmailOtp(to, otp) {
  try {
    const mailOptions = {
      from: `"START GOALS" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify your email - OTP Code",
      text: `Your OTP code is: ${otp}. It expires in 5 minutes.`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">START GOALS</h1>
              <p style="margin: 8px 0 0 0; color: #e2e8f0; font-size: 16px; font-weight: 400;">Email Verification</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600; line-height: 1.3;">Verify Your Email Address</h2>
              
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Hello! We've received a request to verify your email address. Please use the verification code below to complete the process.
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Your Verification Code</p>
                <div style="background: #ffffff; border: 2px solid #667eea; border-radius: 8px; display: inline-block; padding: 15px 25px; margin: 10px 0;">
                  <span style="color: #667eea; font-size: 32px; font-weight: 700; letter-spacing: 3px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
                <p style="margin: 15px 0 0 0; color: #e53e3e; font-size: 14px; font-weight: 500;">
                  <span style="background: #fed7d7; padding: 4px 8px; border-radius: 4px;">⏱️ Expires in 5 minutes</span>
                </p>
              </div>
              
              <!-- Instructions -->
              <div style="background: #f0fff4; border-left: 4px solid #38a169; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.5;">
                  <strong>📝 Instructions:</strong><br>
                  • Enter this code in the verification field<br>
                  • The code is case-sensitive<br>
                  • Don't share this code with anyone
                </p>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #718096; font-size: 14px; line-height: 1.6;">
                If you didn't request this verification, you can safely ignore this email. The code will expire automatically.
              </p>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e2e8f0; margin: 40px 0 30px 0;"></div>
              
              <!-- Footer -->
              <div style="text-align: center;">
                <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 16px; font-weight: 500;">Best regards,</p>
                <p style="margin: 0; color: #667eea; font-size: 18px; font-weight: 600;">START GOALS Team</p>
              </div>
            </div>
            
            <!-- Bottom Footer -->
            <div style="background: #f7fafc; padding: 25px 40px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 13px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.<br>
                © ${new Date().getFullYear()} START GOALS. All rights reserved.
              </p>
            </div>
            
          </div>
          
          <!-- Spacer -->
          <div style="height: 40px;"></div>
        </body>
        </html>
      `,
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        Importance: "High",
      },
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
}

export async function sendSmsOtp(to, otp) {
  await client.messages.create({
    body: `Your OTP code is ${otp}. It expires in 5 minutes.`,
    from: process.env.TWILIO_PHONE,
    to,
  });
}

//used in userRegistration to send otp after registeration

export async function sendOtp(identifier) {
  // Determine delivery method based on identifier format
  let deliveryMethod = "email";
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  if (!isEmail) deliveryMethod = "sms";

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

  // Expire old OTPs
  await Otp.update(
    { status: "expired" },
    {
      where: {
        identifier,
        status: "active",
      },
    },
  );

  // 2️⃣ Soft delete expired or used OTPs
  await Otp.destroy({
    where: {
      identifier,
      status: {
        [Op.in]: ["expired", "used"],
      },
    },
  });

  await Otp.create({
    identifier,
    otp: hashedOtp,
    expiresAt,
    deliveryMethod,
  });

  if (deliveryMethod === "email") await sendEmailOtp(identifier, otp);
  else await sendSmsOtp(identifier, otp);
}

// Verify OTP
export async function verifyOtp(identifier, inputOtp) {
  try {
    const otpEntry = await Otp.findOne({
      where: {
        identifier,
        status: "active",
        expiresAt: { [Op.gt]: new Date() }, // Check it's still valid
      },
      order: [["createdAt", "DESC"]],
    });

    // 🔴 If no OTP found or it's already expired
    if (!otpEntry) {
      return false;
    }

    // ✅ Match OTP
    const isMatch = await bcrypt.compare(inputOtp, otpEntry.otp);
    if (!isMatch) {
      return false;
    }

    // 🟢 Valid OTP - mark it as "used"
    await otpEntry.update({ status: "used" });

    return true;
  } catch {
    throw new Error("Server error during OTP verification");
  }
}

export async function getLastSentTime(identifier) {
  const otp = await Otp.findOne({
    where: {
      identifier,
      status: "active",
    },
    order: [["createdAt", "DESC"]],
  });

  return otp ? otp.createdAt : null;
}
