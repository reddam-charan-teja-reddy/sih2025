"""
Email service utilities
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
import secrets

settings = get_settings()


async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send an email
    Returns: {"success": bool, "messageId": str, "error": str}
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = settings.EMAIL_USER
        message["To"] = to_email
        message["Subject"] = subject
        
        # Add HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send email
        smtp_server = "smtp.gmail.com" if settings.EMAIL_SERVICE == "gmail" else settings.EMAIL_SERVICE
        
        await aiosmtplib.send(
            message,
            hostname=smtp_server,
            port=587,
            start_tls=True,
            username=settings.EMAIL_USER,
            password=settings.EMAIL_PASS,
        )
        
        return {
            "success": True,
            "messageId": f"{to_email}-{secrets.token_hex(8)}",
            "error": None
        }
    except Exception as e:
        print(f"❌ Email sending failed: {str(e)}")
        return {
            "success": False,
            "messageId": None,
            "error": str(e)
        }


async def send_verification_email(email: str, token: str, full_name: str) -> dict:
    """Send account verification email"""
    verification_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0066cc; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Samudra Sahayak</h1>
            </div>
            <div class="content">
                <h2>Hello {full_name}!</h2>
                <p>Thank you for registering with Samudra Sahayak. Please verify your email address to activate your account.</p>
                <p>Click the button below to verify your account:</p>
                <a href="{verification_url}" class="button">Verify Email</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{verification_url}</p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Samudra Sahayak. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "Verify Your Email - Samudra Sahayak", html_content)


async def send_password_reset_email(email: str, token: str, full_name: str) -> dict:
    """Send password reset email"""
    reset_url = f"{settings.FRONTEND_URL}/auth/forgot-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #0066cc; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
            .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello {full_name}!</h2>
                <p>We received a request to reset your password for your Samudra Sahayak account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{reset_url}</p>
                <div class="warning">
                    <strong>Important:</strong>
                    <ul>
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password won't change unless you click the link above and complete the process</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 Samudra Sahayak. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "Reset Your Password - Samudra Sahayak", html_content)


async def send_welcome_email(email: str, full_name: str) -> dict:
    """Send welcome email after account verification"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .button {{ display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Samudra Sahayak!</h1>
            </div>
            <div class="content">
                <h2>Hello {full_name}!</h2>
                <p>Your account has been successfully verified. Welcome to Samudra Sahayak - your reliable partner for coastal safety and emergency reporting.</p>
                <p>You can now:</p>
                <ul>
                    <li>Report emergencies and hazards</li>
                    <li>Receive real-time alerts</li>
                    <li>Track your submitted reports</li>
                    <li>Access safety information and resources</li>
                </ul>
                <a href="{settings.FRONTEND_URL}" class="button">Get Started</a>
            </div>
            <div class="footer">
                <p>&copy; 2025 Samudra Sahayak. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "Welcome to Samudra Sahayak!", html_content)
