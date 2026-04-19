/**
 * Local intent classifier — runs before any API call.
 *
 * Purpose: 70%+ of user messages are greetings, navigation requests,
 * simple searches, or FAQs. These can be handled for $0 without
 * touching Claude. Only route to AI when the message genuinely needs
 * conversational reasoning.
 *
 * Keep this fast and cheap: regex + keyword matching, no async.
 */

export type Intent =
  | { handler: 'greeting' }
  | { handler: 'faq'; topic: 'pricing' | 'how-it-works' | 'instabook' | 'categories' }
  | { handler: 'navigate'; route: string; label: string }
  | { handler: 'search'; params: { q?: string; genre?: string; city?: string } }
  | { handler: 'ai' };

// ─── Greeting patterns ──────────────────────────────────────────
const GREETING_PATTERNS = [
  /^(hi|hello|hey|yo|namaste|namaskar|howdy|sup|hola)\b/i,
  /^good (morning|afternoon|evening|night)\b/i,
  /^(what'?s up|how are you|how'?s it going)/i,
];

// ─── FAQ topic keywords ─────────────────────────────────────────
const FAQ_TOPICS: Array<{ topic: 'pricing' | 'how-it-works' | 'instabook' | 'categories'; patterns: RegExp[] }> = [
  {
    topic: 'pricing',
    patterns: [
      /^(what'?s|how much is) your pricing\??$/i,
      /^pricing\??$/i,
      /^(how much do you|what does it) cost\??$/i,
    ],
  },
  {
    topic: 'how-it-works',
    patterns: [
      /^how does (grid|this|it) work\??$/i,
      /^what is grid\??$/i,
      /^explain grid\b/i,
    ],
  },
  {
    topic: 'instabook',
    patterns: [
      /^what is insta ?book\??$/i,
      /^tell me about insta ?book\b/i,
    ],
  },
  {
    topic: 'categories',
    patterns: [
      /^what categories? (do you|of artists)/i,
      /^what kinds? of artists\??$/i,
      /^what types? of (artists|performers)\??$/i,
    ],
  },
];

// ─── Navigation keywords (strict — only exact route intent) ────
const NAV_ROUTES: Array<{ patterns: RegExp[]; route: string; label: string }> = [
  { patterns: [/^(go to |open |show me )?login$/i, /^sign in$/i, /^log in$/i], route: '/login', label: 'Login' },
  { patterns: [/^(go to |open |show me )?search$/i, /^browse artists$/i], route: '/search', label: 'Search Artists' },
  { patterns: [/^(go to |open |show me )?brief$/i, /^create (a )?brief$/i], route: '/brief', label: 'Create Brief' },
  { patterns: [/^(go to |open )?pricing$/i, /^pricing page$/i], route: '/pricing', label: 'Pricing' },
  { patterns: [/^(go to |open )?home$/i, /^homepage$/i], route: '/', label: 'Home' },
];

// ─── Planning indicators — these always go to AI ───────────────
// If the message contains any of these, don't short-circuit to simple search.
// They imply the user needs real reasoning: budget analysis, venue
// suggestions, date constraints, guest count planning, etc.
const PLANNING_INDICATORS = [
  /\b\d{1,3}(k|l|lakh|crore|cr)\b/i,           // budget mentions (3L, 50k, 2 lakh)
  /\b(budget|lakh|rupees|rs\.?|₹)\b/i,          // money context
  /\b\d{1,4}\s*(guest|people|pax|attendee)/i,   // guest count
  /\b(date|datewise|on the \d|this (week|month)|next (week|month))\b/i,
  /\b(weekend|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(wedding|sangeet|haldi|reception|birthday|anniversary|corporate|college fest|house party)\b/i,
  /\b(venue|hall|lawn|rooftop|banquet|resort|farmhouse|poolside|beach)\b/i,
  /\b(plan|planning|organize|organizing|arrange|arranging|suggest|recommend|help me|what should|which|how do i)\b/i,
];

// ─── Simple search extractor ───────────────────────────────────
const ARTIST_TYPES = [
  'dj', 'djs', 'singer', 'singers', 'band', 'bands', 'comedian', 'comedians',
  'dancer', 'dancers', 'rapper', 'rappers', 'photographer', 'photographers',
  'host', 'hosts', 'emcee', 'mc', 'beatboxer', 'musician', 'musicians',
];

const INDIAN_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
  'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'chandigarh', 'indore',
  'bhopal', 'surat', 'vadodara', 'nagpur', 'goa', 'gurgaon', 'noida', 'thane',
  'coimbatore', 'nashik', 'agra', 'varanasi', 'amritsar', 'ranchi', 'visakhapatnam',
  'dehradun', 'mysore', 'udaipur', 'jodhpur', 'guwahati',
];

const GENRES = [
  'bollywood', 'punjabi', 'sufi', 'ghazal', 'classical', 'rock', 'jazz', 'blues',
  'edm', 'electronic', 'hip hop', 'hip-hop', 'rap', 'pop', 'folk', 'fusion',
  'retro', 'romantic',
];

function extractSearchParams(text: string): { q?: string; genre?: string; city?: string } {
  const lower = text.toLowerCase();
  const params: { q?: string; genre?: string; city?: string } = {};

  // Artist type → q
  const artistType = ARTIST_TYPES.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(lower));
  if (artistType) params.q = artistType;

  // City
  const city = INDIAN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(lower));
  if (city) params.city = city.charAt(0).toUpperCase() + city.slice(1);

  // Genre
  const genre = GENRES.find((g) => new RegExp(`\\b${g.replace('-', '[- ]?')}\\b`, 'i').test(lower));
  if (genre) params.genre = genre;

  return params;
}

// ─── Main classifier ──────────────────────────────────────────
export function classifyIntent(text: string): Intent {
  const trimmed = text.trim();
  if (!trimmed) return { handler: 'ai' };

  // Long messages almost always need AI
  if (trimmed.length > 200) return { handler: 'ai' };

  // Planning indicators short-circuit to AI even for short messages
  const hasPlanningSignal = PLANNING_INDICATORS.some((p) => p.test(trimmed));
  if (hasPlanningSignal) return { handler: 'ai' };

  // Greeting check (must be a short standalone greeting)
  if (trimmed.length < 40 && GREETING_PATTERNS.some((p) => p.test(trimmed))) {
    return { handler: 'greeting' };
  }

  // FAQ check
  for (const { topic, patterns } of FAQ_TOPICS) {
    if (patterns.some((p) => p.test(trimmed))) {
      return { handler: 'faq', topic };
    }
  }

  // Navigation check
  for (const { patterns, route, label } of NAV_ROUTES) {
    if (patterns.some((p) => p.test(trimmed))) {
      return { handler: 'navigate', route, label };
    }
  }

  // Simple artist search? Only if we extracted structured params AND the
  // message is short, conversational-artist-query shaped.
  const params = extractSearchParams(trimmed);
  const hasSearchParams = Boolean(params.q || params.city);
  const looksLikeSearch = /\b(find|show|search|looking for|need|want|get me)\b/i.test(trimmed);

  if (hasSearchParams && looksLikeSearch && trimmed.length < 100) {
    return { handler: 'search', params };
  }

  // Fallthrough: send to AI
  return { handler: 'ai' };
}

// ─── Canned responses (used by /api/chat for greeting + FAQ handlers) ──
export const CANNED_RESPONSES = {
  greeting: [
    "Hey! I'm Zara, GRID's concierge. Tell me about your event — what are you planning?",
    "Hi there! What kind of event are we pulling together?",
    "Namaste! Ready to help you book the right artist. What's the occasion?",
  ],
  faq: {
    pricing: "GRID is free for event planners to use. Artists set their own prices (anywhere from ₹25k for an acoustic solo to ₹15L+ for headliner talent). We charge agencies ₹15,000/mo for the OS — CRM, vault, team collab, proposals, invoices. Want me to find artists in your budget?",
    'how-it-works': "Quick version: tell me your event (type, city, date, budget), I'll recommend the right artists with pricing and availability. You pick, I generate a proposal PDF, and you lock them in. That's it. Want to start with a brief?",
    instabook: "InstaBook is a fixed-price instant booking for common event types — wedding DJ in Mumbai, corporate emcee in Delhi, etc. No negotiation, flat fee, confirmed in minutes. Launching soon — want me to add you to the waitlist?",
    categories: "We've got 10+ categories: singers, DJs, bands, comedians, dancers, rappers, emcees/hosts, photographers, and more. 5K+ verified artists across 30+ Indian cities. What's your event?",
  },
};
