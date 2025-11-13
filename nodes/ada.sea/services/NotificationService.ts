/**
 * NotificationService - Handles SMS and Email notifications
 * Provides notification delivery for Ada Observer alerts
 */

export interface NotificationRecipient {
  name: string;
  email?: string;
  phone?: string;
}

export interface NotificationMessage {
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
}

export interface NotificationResult {
  success: boolean;
  method: 'email' | 'sms' | 'both';
  sentAt: Date;
  messageId: string;
  error?: string;
}

export class NotificationService {
  private emailProvider: string;
  private smsProvider: string;
  private enabled: boolean;

  constructor(config?: {
    emailProvider?: string;
    smsProvider?: string;
    enabled?: boolean;
  }) {
    this.emailProvider = config?.emailProvider || 'default-smtp';
    this.smsProvider = config?.smsProvider || 'default-sms-gateway';
    this.enabled = config?.enabled !== false;
  }

  /**
   * Send email notification
   */
  async sendEmail(
    recipient: NotificationRecipient,
    message: NotificationMessage
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      return {
        success: false,
        method: 'email',
        sentAt: new Date(),
        messageId: '',
        error: 'Notifications disabled',
      };
    }

    if (!recipient.email) {
      return {
        success: false,
        method: 'email',
        sentAt: new Date(),
        messageId: '',
        error: 'No email address provided',
      };
    }

    // Simulate email sending
    const messageId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, integrate with actual email service (e.g., SendGrid, AWS SES)
    // await emailClient.send({
    //   to: recipient.email,
    //   subject: message.subject,
    //   body: message.body,
    //   priority: message.priority
    // });

    return {
      success: true,
      method: 'email',
      sentAt: new Date(),
      messageId,
    };
  }

  /**
   * Send SMS notification
   */
  async sendSMS(
    recipient: NotificationRecipient,
    message: NotificationMessage
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      return {
        success: false,
        method: 'sms',
        sentAt: new Date(),
        messageId: '',
        error: 'Notifications disabled',
      };
    }

    if (!recipient.phone) {
      return {
        success: false,
        method: 'sms',
        sentAt: new Date(),
        messageId: '',
        error: 'No phone number provided',
      };
    }

    // Simulate SMS sending
    const messageId = `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, integrate with actual SMS service (e.g., Twilio, AWS SNS)
    // await smsClient.send({
    //   to: recipient.phone,
    //   body: `${message.subject}\n\n${message.body}`,
    //   priority: message.priority
    // });

    return {
      success: true,
      method: 'sms',
      sentAt: new Date(),
      messageId,
    };
  }

  /**
   * Send notification via both email and SMS
   */
  async sendNotification(
    recipient: NotificationRecipient,
    message: NotificationMessage
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    if (recipient.email) {
      results.push(await this.sendEmail(recipient, message));
    }

    if (recipient.phone) {
      results.push(await this.sendSMS(recipient, message));
    }

    return results;
  }

  /**
   * Send urgent notification (always uses both channels if available)
   */
  async sendUrgentNotification(
    recipient: NotificationRecipient,
    message: NotificationMessage
  ): Promise<NotificationResult[]> {
    return this.sendNotification(recipient, {
      ...message,
      priority: 'urgent',
    });
  }

  /**
   * Enable/disable notifications
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    emailProvider: string;
    smsProvider: string;
  } {
    return {
      enabled: this.enabled,
      emailProvider: this.emailProvider,
      smsProvider: this.smsProvider,
    };
  }
}
