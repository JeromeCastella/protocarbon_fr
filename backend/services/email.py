"""
Service d'envoi d'emails via SMTP
Configuration par défaut pour Infomaniak
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Configuration SMTP (Infomaniak par défaut)
SMTP_HOST = os.environ.get("SMTP_HOST", "mail.infomaniak.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Proto Carbon")

# Frontend URL for links in emails
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email via SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        text_content: Plain text alternative (optional)
    
    Returns:
        True if email was sent successfully, False otherwise
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email not sent.")
        logger.info(f"Would send email to {to_email}: {subject}")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL or SMTP_USER}>"
        msg["To"] = to_email
        
        # Attach text and HTML parts
        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))
        
        # Connect and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_password_reset_email(to_email: str, reset_token: str, user_name: str, language: str = "fr") -> bool:
    """Send password reset email"""
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    if language == "de":
        subject = "Passwort zurücksetzen - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Passwort zurücksetzen</h1>
                </div>
                <div class="content">
                    <p>Hallo {user_name},</p>
                    <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu erstellen:</p>
                    <p style="text-align: center;">
                        <a href="{reset_url}" class="button">Passwort zurücksetzen</a>
                    </p>
                    <p>Dieser Link ist <strong>1 Stunde</strong> gültig.</p>
                    <p>Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
                    <p>Mit freundlichen Grüßen,<br>Das Proto Carbon Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Alle Rechte vorbehalten.</p>
                </div>
            </div>
        </body>
        </html>
        """
    else:
        subject = "Réinitialisation de mot de passe - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Réinitialisation de mot de passe</h1>
                </div>
                <div class="content">
                    <p>Bonjour {user_name},</p>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                    <p style="text-align: center;">
                        <a href="{reset_url}" class="button">Réinitialiser mon mot de passe</a>
                    </p>
                    <p>Ce lien est valable pendant <strong>1 heure</strong>.</p>
                    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
                    <p>Cordialement,<br>L'équipe Proto Carbon</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    return send_email(to_email, subject, html_content)


def send_email_verification(to_email: str, verify_token: str, user_name: str, language: str = "fr") -> bool:
    """Send email verification email"""
    verify_url = f"{FRONTEND_URL}/verify-email?token={verify_token}"
    
    if language == "de":
        subject = "E-Mail-Adresse bestätigen - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✉️ E-Mail bestätigen</h1>
                </div>
                <div class="content">
                    <p>Hallo {user_name},</p>
                    <p>Willkommen bei Proto Carbon! Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf die Schaltfläche unten klicken:</p>
                    <p style="text-align: center;">
                        <a href="{verify_url}" class="button">E-Mail bestätigen</a>
                    </p>
                    <p>Dieser Link ist <strong>24 Stunden</strong> gültig.</p>
                    <p>Mit freundlichen Grüßen,<br>Das Proto Carbon Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Alle Rechte vorbehalten.</p>
                </div>
            </div>
        </body>
        </html>
        """
    else:
        subject = "Confirmez votre adresse email - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✉️ Confirmation d'email</h1>
                </div>
                <div class="content">
                    <p>Bonjour {user_name},</p>
                    <p>Bienvenue sur Proto Carbon ! Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
                    <p style="text-align: center;">
                        <a href="{verify_url}" class="button">Confirmer mon email</a>
                    </p>
                    <p>Ce lien est valable pendant <strong>24 heures</strong>.</p>
                    <p>Cordialement,<br>L'équipe Proto Carbon</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    return send_email(to_email, subject, html_content)


def send_account_locked_email(to_email: str, user_name: str, unlock_minutes: int, language: str = "fr") -> bool:
    """Send account locked notification email"""
    if language == "de":
        subject = "Konto vorübergehend gesperrt - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ef4444, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .warning {{ background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; color: #dc2626; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 Konto gesperrt</h1>
                </div>
                <div class="content">
                    <p>Hallo {user_name},</p>
                    <div class="warning">
                        <p><strong>Ihr Konto wurde vorübergehend gesperrt</strong> aufgrund mehrerer fehlgeschlagener Anmeldeversuche.</p>
                    </div>
                    <p>Sie können es in <strong>{unlock_minutes} Minuten</strong> erneut versuchen.</p>
                    <p>Wenn Sie nicht versucht haben, sich anzumelden, empfehlen wir Ihnen, Ihr Passwort zu ändern, sobald das Konto entsperrt ist.</p>
                    <p>Mit freundlichen Grüßen,<br>Das Proto Carbon Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Alle Rechte vorbehalten.</p>
                </div>
            </div>
        </body>
        </html>
        """
    else:
        subject = "Compte temporairement verrouillé - Proto Carbon"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ef4444, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .warning {{ background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; color: #dc2626; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 Compte verrouillé</h1>
                </div>
                <div class="content">
                    <p>Bonjour {user_name},</p>
                    <div class="warning">
                        <p><strong>Votre compte a été temporairement verrouillé</strong> suite à plusieurs tentatives de connexion échouées.</p>
                    </div>
                    <p>Vous pourrez réessayer dans <strong>{unlock_minutes} minutes</strong>.</p>
                    <p>Si vous n'avez pas tenté de vous connecter, nous vous recommandons de changer votre mot de passe dès que le compte sera déverrouillé.</p>
                    <p>Cordialement,<br>L'équipe Proto Carbon</p>
                </div>
                <div class="footer">
                    <p>© 2024 Proto Carbon. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    return send_email(to_email, subject, html_content)
