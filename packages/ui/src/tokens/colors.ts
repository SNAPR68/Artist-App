// ArtistBook Design System v2 — Color Tokens
// Premium dark theme with electric blue → purple → magenta gradient accents

export const colors = {
  // Primary — Electric Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Primary anchor
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Secondary — Violet/Purple
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Secondary anchor
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  // Accent gradient stops
  accent: {
    blue: '#3B82F6',
    indigo: '#6366F1',
    violet: '#8B5CF6',
    purple: '#7C3AED',
    magenta: '#EC4899',
    pink: '#F472B6',
  },
  // Surface layers — dark background hierarchy
  surface: {
    bg: '#030712',       // Page background — near-black with blue undertone
    base: '#0A0F1A',     // Section backgrounds
    card: '#111827',     // Cards, modals, dropdowns
    elevated: '#1E293B', // Hover states, active items
    overlay: '#334155',  // Tooltips, popovers
  },
  // Glass morphism
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    heavy: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.10)',
  },
  // Text colors for dark theme
  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    inverse: '#030712',
  },
  // Semantic — unchanged (works on dark)
  semantic: {
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  // Neutral grays
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Booking state colors — business logic, do not change
  bookingStates: {
    inquiry: '#3B82F6',
    shortlisted: '#8B5CF6',
    quoted: '#06B6D4',
    negotiating: '#F59E0B',
    confirmed: '#10B981',
    pre_event: '#6366F1',
    event_day: '#EC4899',
    completed: '#059669',
    settled: '#047857',
    cancelled: '#EF4444',
    expired: '#9CA3AF',
    disputed: '#DC2626',
  },
} as const;
