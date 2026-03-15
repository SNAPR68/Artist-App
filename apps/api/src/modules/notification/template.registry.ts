/**
 * Notification template registry.
 * Maps internal event types to WhatsApp template IDs, SMS flow IDs, and push notification copy.
 */

export interface NotificationTemplate {
  whatsapp_template_id: string;
  sms_flow_id: string;
  push_title: string;
  push_body: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  inquiry_received: {
    whatsapp_template_id: 'booking_inquiry_v1',
    sms_flow_id: 'flow_inquiry',
    push_title: 'New Booking Inquiry',
    push_body: '{{client_name}} wants to book you for {{event_type}} on {{event_date}}',
  },
  quote_received: {
    whatsapp_template_id: 'quote_received_v1',
    sms_flow_id: 'flow_quote',
    push_title: 'Quote Received',
    push_body: 'You received a quote of ₹{{amount}} for your {{event_type}} booking',
  },
  booking_confirmed: {
    whatsapp_template_id: 'booking_confirmed_v1',
    sms_flow_id: 'flow_confirmed',
    push_title: 'Booking Confirmed!',
    push_body: 'Your booking for {{event_type}} on {{event_date}} is confirmed',
  },
  payment_received: {
    whatsapp_template_id: 'payment_received_v1',
    sms_flow_id: 'flow_payment',
    push_title: 'Payment Received',
    push_body: 'Payment of ₹{{amount}} received for booking {{booking_id}}',
  },
  booking_cancelled: {
    whatsapp_template_id: 'booking_cancelled_v1',
    sms_flow_id: 'flow_cancelled',
    push_title: 'Booking Cancelled',
    push_body: 'Your booking for {{event_type}} on {{event_date}} has been cancelled',
  },
  event_reminder: {
    whatsapp_template_id: 'event_reminder_v1',
    sms_flow_id: 'flow_reminder',
    push_title: 'Event Tomorrow',
    push_body: 'Reminder: {{event_type}} at {{venue}} tomorrow',
  },
  settlement_complete: {
    whatsapp_template_id: 'settlement_complete_v1',
    sms_flow_id: 'flow_settlement',
    push_title: 'Payment Settled',
    push_body: '₹{{amount}} has been credited to your account for booking {{booking_id}}',
  },
  review_published: {
    whatsapp_template_id: 'review_published_v1',
    sms_flow_id: 'flow_review',
    push_title: 'New Review',
    push_body: 'A new review has been published for your recent booking',
  },
};

/**
 * Interpolate variables into a template string.
 * Replaces {{key}} with the corresponding value from variables.
 */
export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}
