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

  // ─── Coordination Templates ─────────────────────────────────
  coordination_rider: {
    whatsapp_template_id: 'coordination_rider_v1',
    sms_flow_id: 'flow_coord_rider',
    push_title: 'Rider Confirmation Needed',
    push_body: 'Please confirm the technical rider for {{event_type}} on {{event_date}}. Due by {{deadline}}.',
    email_subject: 'Action Required: Confirm Rider — {{event_type}}',
    email_body: 'The technical rider for your <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong> needs confirmation by <strong>{{deadline}}</strong>. Log in to review and confirm.',
  },
  coordination_logistics: {
    whatsapp_template_id: 'coordination_logistics_v1',
    sms_flow_id: 'flow_coord_logistics',
    push_title: 'Logistics Details Needed',
    push_body: 'Please update travel & hotel details for {{event_type}} on {{event_date}}. Due by {{deadline}}.',
    email_subject: 'Action Required: Logistics Details — {{event_type}}',
    email_body: 'Logistics details (travel, hotel, parking) for <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong> need to be confirmed by <strong>{{deadline}}</strong>.',
  },
  coordination_final_reminder: {
    whatsapp_template_id: 'coordination_final_v1',
    sms_flow_id: 'flow_coord_final',
    push_title: 'Final Confirmation Needed',
    push_body: 'Final confirmation needed for {{event_type}} on {{event_date}} — event is in {{days_until}} days!',
    email_subject: 'Final Confirmation — {{event_type}} in {{days_until}} Days',
    email_body: 'Your <strong>{{event_type}}</strong> is in <strong>{{days_until}} days</strong>. Please complete your final confirmation checklist now.',
  },
  coordination_escalation: {
    whatsapp_template_id: 'coordination_escalation_v1',
    sms_flow_id: 'flow_coord_escalation',
    push_title: 'Urgent: Overdue Coordination',
    push_body: '⚠ Coordination checkpoint overdue for {{event_type}} on {{event_date}}. Please respond immediately.',
    email_subject: 'URGENT: Overdue Coordination — {{event_type}}',
    email_body: 'A coordination checkpoint for <strong>{{event_type}}</strong> on <strong>{{event_date}}</strong> is overdue. This has been escalated. Please respond immediately to avoid booking issues.',
  },

  // ─── Event-Day Templates ────────────────────────────────────
  event_day_arrival: {
    whatsapp_template_id: 'event_day_arrival_v1',
    sms_flow_id: 'flow_ed_arrival',
    push_title: 'Artist Arrived',
    push_body: '{{artist_name}} has checked in at {{venue}} for {{event_type}}',
    email_subject: 'Artist Arrived — {{event_type}}',
    email_body: '<strong>{{artist_name}}</strong> has checked in at <strong>{{venue}}</strong> for your <strong>{{event_type}}</strong>. GPS verified.',
  },
  event_day_issue: {
    whatsapp_template_id: 'event_day_issue_v1',
    sms_flow_id: 'flow_ed_issue',
    push_title: 'Issue Flagged',
    push_body: 'An issue was flagged for {{event_type}} at {{venue}}: {{issue_type}}',
    email_subject: 'Issue Flagged — {{event_type}}',
    email_body: 'An issue has been flagged for <strong>{{event_type}}</strong> at <strong>{{venue}}</strong>: <strong>{{issue_type}}</strong>. Details: {{description}}',
  },
  event_day_completed: {
    whatsapp_template_id: 'event_day_completed_v1',
    sms_flow_id: 'flow_ed_completed',
    push_title: 'Event Completed',
    push_body: '{{event_type}} at {{venue}} has been marked complete by both parties. 🎉',
    email_subject: 'Event Completed — {{event_type}}',
    email_body: 'Your <strong>{{event_type}}</strong> at <strong>{{venue}}</strong> has been marked complete by both parties. Settlement will be processed automatically.',
  },

  // ─── Event Context Templates ──────────────────────────────
  event_context_request: {
    whatsapp_template_id: 'event_context_request_v1',
    sms_flow_id: 'flow_event_context',
    push_title: 'Share Event Details',
    push_body: 'How was the event? Share crowd details for {{event_type}} to improve future matches.',
    email_subject: 'Share Event Details — {{event_type}}',
    email_body: 'Your <strong>{{event_type}}</strong> is complete! Share crowd demographics and event details to help improve future artist-venue matching.',
  },

  // ─── Calendar Intelligence Templates ──────────────────────
  calendar_intelligence_opportunity: {
    whatsapp_template_id: 'cal_intel_opportunity_v1',
    sms_flow_id: 'flow_cal_opportunity',
    push_title: 'High Demand Opportunity',
    push_body: 'High demand for {{genre}} in {{city}} on {{date}}. You\'re available — consider marketing this date!',
    email_subject: 'High Demand Opportunity — {{genre}} in {{city}}',
    email_body: 'There is <strong>high demand</strong> for <strong>{{genre}}</strong> in <strong>{{city}}</strong> on <strong>{{date}}</strong>. You\'re available on this date — consider marketing it!',
  },
  calendar_intelligence_seasonal: {
    whatsapp_template_id: 'cal_intel_seasonal_v1',
    sms_flow_id: 'flow_cal_seasonal',
    push_title: 'Seasonal Opportunity',
    push_body: '{{event_type}} season approaching in {{city}}. Update your pricing and availability.',
    email_subject: 'Seasonal Alert — {{event_type}} in {{city}}',
    email_body: '<strong>{{event_type}}</strong> season is approaching in <strong>{{city}}</strong>. Update your pricing and availability to capture demand.',
  },

  // ─── Pricing Brain Templates ──────────────────────────────
  pricing_recommendation: {
    whatsapp_template_id: 'pricing_rec_v1',
    sms_flow_id: 'flow_pricing_rec',
    push_title: 'Pricing Insight',
    push_body: 'Price check: You may be {{direction}} for {{event_type}} in {{city}}. See our recommendation.',
    email_subject: 'Pricing Recommendation — {{event_type}} in {{city}}',
    email_body: 'Our pricing intelligence suggests you may be <strong>{{direction}}</strong> for <strong>{{event_type}}</strong> in <strong>{{city}}</strong>. Log in to review the recommendation and market data.',
  },
  pricing_opportunity: {
    whatsapp_template_id: 'pricing_opp_v1',
    sms_flow_id: 'flow_pricing_opp',
    push_title: 'Pricing Opportunity',
    push_body: 'High demand for {{genre}} in {{city}} next month. Consider adjusting your rates.',
    email_subject: 'Demand-Based Pricing Opportunity — {{genre}}',
    email_body: 'High demand for <strong>{{genre}}</strong> in <strong>{{city}}</strong> is expected next month. Consider adjusting your rates to capture this opportunity.',
  },

  // ─── WhatsApp Flow Templates ──────────────────────────────
  whatsapp_welcome: {
    whatsapp_template_id: 'wa_welcome_v1',
    sms_flow_id: 'flow_wa_welcome',
    push_title: 'Welcome',
    push_body: 'Welcome! I can help you find and book artists. What are you looking for?',
    email_subject: 'Welcome to Artist Booking',
    email_body: 'Welcome! You can find and book artists for your event via WhatsApp. Just send a message to get started.',
  },
  whatsapp_inquiry_created: {
    whatsapp_template_id: 'wa_inquiry_v1',
    sms_flow_id: 'flow_wa_inquiry',
    push_title: 'Booking Inquiry Created',
    push_body: 'Booking inquiry #{{booking_id}} created! The artist will respond within {{response_hours}}h.',
    email_subject: 'Booking Inquiry Created via WhatsApp',
    email_body: 'Your booking inquiry <strong>#{{booking_id}}</strong> has been created via WhatsApp. The artist will respond within <strong>{{response_hours}} hours</strong>.',
  },
};

/**
 * Interpolate variables into a template string.
 * Replaces {{key}} with the corresponding value from variables.
 */
export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}
