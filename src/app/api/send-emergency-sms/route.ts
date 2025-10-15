import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const detectCarrier = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  let localNumber = cleaned;
  if (cleaned.startsWith('233')) {
    localNumber = '0' + cleaned.substring(3);
  }
  
  if (localNumber.match(/^0(24|54|55|59)/)) return 'MTN Ghana';
  if (localNumber.match(/^0(20|50)/)) return 'Vodafone Ghana';
  if (localNumber.match(/^0(27|57|26|56)/)) return 'AirtelTigo Ghana';
  
  return 'Unknown Carrier';
};

const formatPhoneForSMS = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('233')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+233' + cleaned.substring(1);
  }
  
  return '+233' + cleaned;
};

const isValidGhanaNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('233')) {
    return cleaned.length === 12;
  } else if (cleaned.startsWith('0')) {
    return cleaned.length === 10;
  }
  
  return false;
};

export async function POST(request: NextRequest) {
  try {
    const { 
      phoneNumber, 
      contactName, 
      userName, 
      userLocation, 
      relationship,
      contactEmail,
      useEmail = false // Flag to force email instead of SMS
    } = await request.json();

    if (!phoneNumber && !contactEmail) {
      return NextResponse.json({ 
        error: 'Phone number or email is required' 
      }, { status: 400 });
    }

    // Validate phone number if provided
    if (phoneNumber && !isValidGhanaNumber(phoneNumber)) {
      return NextResponse.json({ 
        error: 'Invalid Ghana phone number format. Please use +233XXXXXXXXX or 0XXXXXXXXX format.' 
      }, { status: 400 });
    }

    const carrier = phoneNumber ? detectCarrier(phoneNumber) : 'N/A';
    const formattedNumber = phoneNumber ? formatPhoneForSMS(phoneNumber) : null;

    const locationText = userLocation 
      ? `\nLocation: https://maps.google.com/?q=${userLocation}` 
      : '';
    
    const relationshipText = relationship ? ` (${relationship})` : '';
    
    // If email is requested or no phone number, send email
    if (useEmail || !phoneNumber || contactEmail) {
      // Check if email credentials are configured
      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.error('SMTP credentials not configured');
        return NextResponse.json({ 
          error: 'Email service not configured. Please contact administrator.' 
        }, { status: 500 });
      }

      if (!contactEmail) {
        return NextResponse.json({ 
          error: 'Email address is required for email notifications' 
        }, { status: 400 });
      }

      // Email message with HTML formatting
      const emailSubject = '🚨 EMERGENCY ALERT - Immediate Assistance Required';
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .alert-icon { font-size: 48px; margin-bottom: 10px; }
            .message { background-color: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; }
            .location { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="alert-icon">🚨</div>
              <h1 style="margin: 0;">EMERGENCY ALERT</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Immediate Assistance Required</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 20px;">Dear ${contactName}${relationshipText},</p>
              
              <div class="message">
                <p style="font-size: 16px; margin: 0;"><strong>${userName}</strong> has triggered an emergency alert and needs immediate assistance.</p>
              </div>

              <p style="font-size: 16px; margin: 20px 0;">Please contact them as soon as possible to ensure their safety.</p>

              ${userLocation ? `
              <div class="location">
                <p style="margin: 0 0 10px 0;"><strong>📍 Approximate Location:</strong></p>
                <a href="https://maps.google.com/?q=${userLocation}" class="button" target="_blank">View Location on Map</a>
              </div>
              ` : ''}

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                <strong>What to do:</strong><br>
                1. Contact ${userName} immediately by phone<br>
                2. If unreachable, consider contacting emergency services (193 - National Ambulance)<br>
                3. Check the location provided above if available
              </p>
            </div>
            <div class="footer">
              <p>This is an automated emergency alert from HealthConnect Navigator Emergency Hub</p>
              <p>© 2025 HealthConnect Navigator. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `🚨 EMERGENCY ALERT 🚨

Dear ${contactName}${relationshipText},

${userName} has triggered an emergency alert and needs immediate assistance. Please contact them as soon as possible to ensure their safety.
${locationText}

What to do:
1. Contact ${userName} immediately by phone
2. If unreachable, consider contacting emergency services (193 - National Ambulance)
3. Check the location provided above if available

This is an automated emergency alert from HealthConnect Navigator Emergency Hub.
`;

      console.log('Attempting to send email to:', {
        email: contactEmail,
        contactName: contactName
      });

      // Configure nodemailer with Gmail SMTP
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify SMTP connection
      try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
      } catch (verifyError: any) {
        console.error('SMTP verification failed:', verifyError);
        return NextResponse.json({ 
          error: 'Email service connection failed. Please check configuration.' 
        }, { status: 500 });
      }

      // Send email
      const mailOptions = {
        from: `"HealthConnect Emergency Alert" <${process.env.SMTP_EMAIL}>`,
        to: contactEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        to: contactEmail
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Emergency email sent successfully',
        method: 'email',
        messageId: info.messageId,
        email: contactEmail
      });
    }

    // Otherwise, return SMS URI for mobile
    const smsMessage = `🚨 EMERGENCY ALERT 🚨

${contactName}${relationshipText},

${userName} needs immediate assistance. Please contact them ASAP.${locationText}

- HealthConnect Navigator`;

    const smsURI = `sms:${formattedNumber}?body=${encodeURIComponent(smsMessage)}`;

    console.log('SMS URI generated:', {
      phoneNumber: phoneNumber,
      formattedNumber: formattedNumber,
      carrier: carrier,
      contactName: contactName
    });

    return NextResponse.json({ 
      success: true, 
      message: `SMS ready for ${carrier}`,
      method: 'sms',
      carrier: carrier,
      phoneNumber: phoneNumber,
      smsURI: smsURI
    });

  } catch (error: any) {
    console.error('Notification error:', error);
    
    let errorMessage = 'Failed to send emergency notification';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check SMTP credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Please check internet connection.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const emailConfigured = !!(process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD);
    
    return NextResponse.json({
      service: 'Emergency Notification API',
      status: 'operational',
      methods: {
        sms: {
          available: true,
          description: 'Native SMS (mobile only)',
          cost: 'User pays from their phone plan (~GHS 0.10-0.20)'
        },
        email: {
          available: emailConfigured,
          description: 'Email fallback (desktop/mobile)',
          cost: 'Free'
        }
      },
      supportedCarriers: ['MTN Ghana', 'Vodafone Ghana', 'AirtelTigo Ghana', 'All Carriers'],
      message: emailConfigured 
        ? 'SMS and Email services are ready' 
        : 'SMS ready, Email requires SMTP configuration'
    });
  } catch (error) {
    return NextResponse.json({
      service: 'Emergency Notification API',
      status: 'error',
      error: 'Service health check failed'
    }, { status: 500 });
  }
}