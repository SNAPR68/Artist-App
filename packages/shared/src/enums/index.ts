export enum UserRole {
  ARTIST = 'artist',
  AGENT = 'agent',
  CLIENT = 'client',
  EVENT_COMPANY = 'event_company',
  ADMIN = 'admin',
}

export enum BookingState {
  INQUIRY = 'inquiry',
  SHORTLISTED = 'shortlisted',
  QUOTED = 'quoted',
  NEGOTIATING = 'negotiating',
  CONFIRMED = 'confirmed',
  PRE_EVENT = 'pre_event',
  EVENT_DAY = 'event_day',
  COMPLETED = 'completed',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  DISPUTED = 'disputed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  IN_ESCROW = 'in_escrow',
  SETTLED = 'settled',
  REFUND_INITIATED = 'refund_initiated',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
}

export enum MediaType {
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
}

export enum TranscodeStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CalendarStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}

export enum EventType {
  WEDDING = 'wedding',
  CORPORATE = 'corporate',
  PRIVATE_PARTY = 'private_party',
  CONCERT = 'concert',
  CLUB_GIG = 'club_gig',
  FESTIVAL = 'festival',
  COLLEGE_EVENT = 'college_event',
  RESTAURANT = 'restaurant',
  OTHER = 'other',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  PUSH = 'push',
  EMAIL = 'email',
}

export enum CityTier {
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  TIER_3 = 'tier_3',
}
