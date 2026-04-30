import { config } from '../config/index.js';
import { providersConfig } from '../config/providers.js';
import { logger } from '../utils/logger.js';

/**
 * Email service that uses Resend API with fallback to console logging.
 * Handles email sending for notifications, verification codes, and transactional emails.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

class EmailService {
  private resendApiKey?: string;
  private emailFrom: string;
  private enabled: boolean;

  constructor() {
    this.resendApiKey = providersConfig.resend.apiKey;
    this.emailFrom = config.EMAIL_FROM;
    this.enabled = providersConfig.resend.enabled;

    if (!this.enabled) {
      logger.warn('Email service disabled: Resend API key not configured');
    }
  }

  /**
   * Send an email using Resend or fallback to console
   */
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate email address
      if (!this.isValidEmail(options.to)) {
        throw new Error(`Invalid email address: ${options.to}`);
      }

      if (!options.html && !options.text) {
        throw new Error('Email must have either html or text content');
      }

      // Use Resend if available
      if (this.enabled && this.resendApiKey) {
        return await this.sendWithResend(options);
      }

      // Fallback to console
      return this.sendWithConsole(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = error.message;
      logger.error('Failed to send email', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send email using Resend API
   */
  private async sendWithResend(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.emailFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Resend error shape varies
        const errorData = await response.json() as any;
        throw new Error(`Resend API error: ${errorData?.message || 'Unknown error'}`);
      }

      const data = await response.json() as { id: string };
      logger.info('Email sent via Resend', { to: options.to, messageId: data.id });

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      logger.error('Resend API error', error instanceof Error ? error : { error });
      throw error;
    }
  }

  /**
   * Fallback: log email to console
   */
  private sendWithConsole(options: EmailOptions): { success: boolean; messageId?: string } {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('[CONSOLE EMAIL]', {
      from: this.emailFrom,
      to: options.to,
      subject: options.subject,
      messageId,
      preview: options.html?.substring(0, 100) || options.text?.substring(0, 100),
    });
    return { success: true, messageId };
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(email: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      to: email,
      subject: 'Your OTP for Artist Booking Platform',
      html: `
        <h2>OTP Verification</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing: 0.2em; font-family: monospace; font-size: 24px; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Your OTP is: ${otp}. This expires in 10 minutes.`,
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    email: string,
    bookingDetails: { bookingId: string; artistName: string; eventDate: string; amount: number },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      to: email,
      subject: `Booking Confirmed - ${bookingDetails.artistName}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Your booking has been confirmed.</p>
        <dl>
          <dt>Booking ID:</dt>
          <dd>${bookingDetails.bookingId}</dd>
          <dt>Artist:</dt>
          <dd>${bookingDetails.artistName}</dd>
          <dt>Event Date:</dt>
          <dd>${bookingDetails.eventDate}</dd>
          <dt>Amount:</dt>
          <dd>₹${bookingDetails.amount}</dd>
        </dl>
        <p>Thank you for using Artist Booking Platform!</p>
      `,
      text: `Booking ${bookingDetails.bookingId} confirmed for ${bookingDetails.artistName} on ${bookingDetails.eventDate}.`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Reset your password: ${resetLink}`,
    });
  }

  /**
   * Vendor onboarding email (sprint FINAL D4.3, 2026-04-26).
   *
   * Sent when an event company adds a new vendor to their roster — welcomes
   * the vendor to GRID, explains the WhatsApp + email workflow (confirmation,
   * call sheet, day-of check-in), and provides a link to complete their
   * profile (stage name, category, rider, base rate).
   */
  async sendVendorOnboarding(
    email: string,
    vendor: {
      stageName: string;
      agencyName: string;
      profileUrl: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { stageName, agencyName, profileUrl } = vendor;
    return this.send({
      to: email,
      subject: `${agencyName} just added you to GRID — complete your profile`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #8A2BE2; margin-bottom: 8px;">Welcome to GRID</h2>
          <p style="margin-top: 0; color: #555;">India's event company operating system.</p>
          <p>Hi ${stageName},</p>
          <p><strong>${agencyName}</strong> just added you to their vendor roster on GRID. To receive booking confirmations, call sheets, and day-of check-ins, complete your profile in 2 minutes.</p>
          <p style="margin: 24px 0;">
            <a href="${profileUrl}" style="background-color: #8A2BE2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Complete my profile</a>
          </p>
          <h3 style="margin-top: 32px; font-size: 16px;">How GRID works for vendors</h3>
          <ul style="padding-left: 20px; line-height: 1.6;">
            <li><strong>Confirmation:</strong> You get a WhatsApp + email ping when an agency wants to book you. Reply YES/NO.</li>
            <li><strong>Call sheet:</strong> Event details, venue, call time, and BOQ arrive by email as a PDF + Excel.</li>
            <li><strong>Day-of check-in:</strong> A single WhatsApp message the morning of the show — "On track / Delayed / Need help".</li>
            <li><strong>No voice calls.</strong> GRID is WhatsApp + email only.</li>
          </ul>
          <p style="color: #777; font-size: 13px; margin-top: 32px;">If you didn't expect this email, you can ignore it — ${agencyName} will see you haven't onboarded and may reach out directly.</p>
          <p style="color: #777; font-size: 13px;">— The GRID Team</p>
        </div>
      `,
      text: `Welcome to GRID.

${agencyName} just added you to their vendor roster. Complete your profile to receive booking confirmations, call sheets, and day-of check-ins:

${profileUrl}

How GRID works for vendors:
- Confirmation: WhatsApp + email when an agency wants to book you (reply YES/NO)
- Call sheet: PDF + Excel by email with event details, venue, call time, and BOQ
- Day-of check-in: one WhatsApp message — "On track / Delayed / Need help"
- No voice calls. GRID is WhatsApp + email only.

— The GRID Team`,
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailService = new EmailService();
export type { EmailService };
