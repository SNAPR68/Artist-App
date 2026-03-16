/**
 * Notification template registry.
 * Maps internal event types to WhatsApp template IDs, SMS flow IDs, and push notification copy.
 */

export interface NotificationTemplate {
  whatsapp_template_id: string;
  sms_flow_id: string;
  push_title: string;
  push_body: string;
  email_subject?: string;
  email_body?: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  inquiry_received: {
    whatsapp_template_id: 'booking_inquiry_v1',
    sms_flow_id: 'flow_inquiry',
    push_title: 'New Booking Inquiry',
    push_body: '{{client_name}} wants to book you for {{event_type}} on {{event_date}}',
    email_subject: 'New Booking Inquiry from {{client_name}}',
    email_body: 'You have a new booking inquiry from <strong>{{client_name}}</strong> for a <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong>. Log in to respond.',
  },
  quote_received: {
    whatsapp_template_id: 'quote_received_v1',
    sms_flow_id: 'flow_quote',
    push_title: 'Quote Received',
    push_body: 'You received a quote of ₹{{amount}} for your {{event_type}} booking',
    email_subject: 'New Quote — ₹{{amount}}',
    email_body: 'A quote of <strong>₹{{amount}}</strong> has been submitted for your <strong>{{event_type}}</strong> booking. Log in to review.',
  },
  booking_confirmed: {
    whatsapp_template_id: 'booking_confirmed_v1',
    sms_flow_id: 'flow_confirmed',
    push_title: 'Booking Confirmed!',
    push_body: 'Your booking for {{event_type}} on {{event_date}} is confirmed',
    email_subject: 'Booking Confirmed — {{event_type}} on {{event_date}}',
    email_body: 'Your booking for <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong> is confirmed at <strong>₹{{amount}}</strong>. You can download your contract from the dashboard.',
  },
  payment_received: {
    whatsapp_template_id: 'payment_received_v1',
    sms_flow_id: 'flow_payment',
    push_title: 'Payment Received',
    push_body: 'Payment of ₹{{amount}} received for booking {{booking_id}}',
    email_subject: 'Payment Received — ₹{{amount}}',
    email_body: 'Payment of <strong>₹{{amount}}</strong> has been received for booking <strong>{{booking_id}}</strong>.',
  },
  booking_cancelled: {
    whatsapp_template_id: 'booking_cancelled_v1',
    sms_flow_id: 'flow_cancelled',
    push_title: 'Booking Cancelled',
    push_body: 'Your booking for {{event_type}} on {{event_date}} has been cancelled',
    email_subject: 'Booking Cancelled — {{event_type}}',
    email_body: 'Your booking for <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong> has been cancelled.',
  },
  event_reminder: {
    whatsapp_template_id: 'event_reminder_v1',
    sms_flow_id: 'flow_reminder',
    push_title: 'Event Tomorrow',
    push_body: 'Reminder: {{event_type}} at {{venue}} tomorrow',
    email_subject: 'Event Reminder — {{event_type}} Tomorrow',
    email_body: 'Reminder: Your <strong>{{event_type}}</strong> at <strong>{{venue}}</strong> is tomorrow. Make sure everything is ready!',
  },
  settlement_complete: {
    whatsapp_template_id: 'settlement_complete_v1',
    sms_flow_id: 'flow_settlement',
    push_title: 'Payment Settled',
    push_body: '₹{{amount}} has been credited to your account for booking {{booking_id}}',
    email_subject: 'Payout Credited — ₹{{amount}}',
    email_body: '<strong>₹{{amount}}</strong> has been credited to your bank account for booking <strong>{{booking_id}}</strong>.',
  },
  review_published: {
    whatsapp_template_id: 'review_published_v1',
    sms_flow_id: 'flow_review',
    push_title: 'New Review',
    push_body: 'A new review has been published for your recent booking',
    email_subject: 'New Review Published',
    email_body: 'A new review has been published for your recent booking. Log in to your dashboard to read it.',
  },
};

/**
 * Interpolate variables into a template string.
 * Replaces {{key}} with the corresponding value from variables.
 */
export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}
