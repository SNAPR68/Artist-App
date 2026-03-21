/**
 * Rule-based intent parser for voice queries.
 * v1: Keyword matching in Hindi/English (Hinglish) + regex entity extraction.
 * Supports 6 voice intents: DISCOVER, STATUS, ACTION, INTELLIGENCE, EMERGENCY, NAVIGATE.
 */

import { db } from '../../infrastructure/database.js';

// ─── Types ──────────────────────────────────────────────────

export interface VoiceParsedIntent {
  intent: string;
  entities: {
    city?: string;
    date?: string;
    genre?: string;
    budget?: number;
    artist_name?: string;
    booking_id?: string;
    event_type?: string;
    action_verb?: string;
    page_target?: string;
  };
  confidence: number;
  raw_text: string;
}

// ─── Intent keywords ────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  DISCOVER: [
    'find', 'search', 'suggest', 'recommend', 'chahiye', 'dhundh',
    'band', 'singer', 'dj', 'show me', 'dikhao', 'batao',
    'koi accha', 'artist', 'performer',
  ],
  STATUS: [
    'status', 'kahan tak', 'kya hua', 'booking ka', 'payment ka',
    'update', 'track', 'where is', 'how is', 'check booking',
    'booking status', 'my bookings', 'recent bookings',
  ],
  ACTION: [
    'book', 'confirm', 'cancel', 'hold', 'accept', 'reject',
    'schedule', 'karo', 'kar do', 'block date',
  ],
  INTELLIGENCE: [
    'demand', 'price', 'earnings', 'earn', 'forecast', 'season', 'trend',
    'kitna kamaaya', 'how much', 'market', 'analytics', 'revenue', 'income',
    'charge', 'underpriced', 'overpriced', 'positioning', 'percentile',
  ],
  EMERGENCY: [
    'cancel ho gaya', 'replacement', 'substitute', 'urgent',
    'emergency', 'backup', 'last minute', 'who can replace',
  ],
  NAVIGATE: [
    'go to', 'go to my', 'show me', 'show my', 'open', 'open my', 'navigate',
    'take me to', 'take me to my', 'switch to', 'go back to',
    'jao', 'dikhao', 'kholo', 'dekho', 'mera', 'mere', 'meri',
    'page', 'dashboard', 'screen', 'section',
  ],
};

// Sorted keywords per intent: longest first for multi-word matching
const SORTED_INTENT_KEYWORDS: Record<string, string[]> = {};
for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
  SORTED_INTENT_KEYWORDS[intent] = [...keywords].sort((a, b) => b.length - a.length);
}

// ─── Hinglish event type map ────────────────────────────────

const HINGLISH_EVENT_MAP: Record<string, string> = {
  shaadi: 'wedding',
  shadi: 'wedding',
  corporate: 'corporate',
  party: 'private_party',
  'college fest': 'college_event',
  sangeet: 'wedding',
  mehendi: 'wedding',
  reception: 'wedding',
};

// English event types
const ENGLISH_EVENT_TYPES = [
  'wedding', 'corporate', 'private_party', 'college_event',
  'concert', 'festival', 'birthday', 'engagement',
];

// ─── Regex patterns (reused from whatsapp-intent) ───────────

const DATE_PATTERNS = [
  /(\d{4}-\d{2}-\d{2})/,
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  /(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i,
  /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
];

const BUDGET_PATTERNS = [
  /(\d+)\s*(?:k|K)/,
  /(\d+)\s*(?:lakh|lac|L)/i,
  /(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i,
  /(\d{4,})\s*(?:rupees?)?/i,
];

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const ACTION_VERBS = ['book', 'confirm', 'cancel', 'hold', 'accept', 'reject', 'schedule'];

const GENRE_KEYWORDS = [
  'bollywood', 'sufi', 'rock', 'pop', 'classical', 'hip hop', 'hip-hop',
  'electronic', 'edm', 'folk', 'ghazal', 'jazz', 'fusion', 'indie',
  'punjabi', 'rap', 'acoustic', 'devotional', 'bhajan',
];

// ─── Page target map (for NAVIGATE intent) ──────────────────

const PAGE_TARGETS: Record<string, string> = {
  'bookings': 'bookings', 'booking': 'bookings',
  'calendar': 'calendar', 'availability': 'calendar',
  'earnings': 'earnings', 'kamaai': 'earnings', 'income': 'earnings',
  'financial': 'financial', 'paisa': 'financial', 'money': 'financial',
  'intelligence': 'intelligence', 'insights': 'intelligence',
  'gig advisor': 'gig-advisor', 'advisor': 'gig-advisor',
  'profile': 'profile', 'settings': 'settings',
  'workspace': 'workspace', 'crm': 'workspace', 'pipeline': 'workspace',
  'gigs': 'gigs', 'marketplace': 'gigs', 'jobs': 'gigs', 'opportunities': 'gigs',
  'search': 'search', 'find': 'search', 'discover': 'search',
  'notifications': 'notifications', 'alerts': 'notifications',
  'home': 'home', 'dashboard': 'home', 'ghar': 'home',
  'seasonal': 'seasonal', 'demand': 'seasonal', 'trends': 'seasonal',
  'reputation': 'reputation',
  'gamification': 'gamification', 'points': 'gamification', 'badges': 'gamification',
  'recommendations': 'recommendations', 'suggested': 'recommendations',
  'shortlist': 'shortlists', 'shortlists': 'shortlists', 'saved': 'shortlists',
  'substitution': 'substitutions', 'replacement': 'substitutions',
  'payments': 'payments', 'payment': 'payments', 'invoices': 'payments', 'billing': 'payments',
  'team': 'team', 'members': 'team', 'team members': 'team',
  'roster': 'roster', 'my artists': 'roster', 'artist roster': 'roster',
  'commissions': 'commissions', 'commission': 'commissions',
  'backup': 'backup', 'data backup': 'backup',
  'voice': 'voice', 'voice assistant': 'voice',
  'achievements': 'gamification', 'rewards': 'gamification', 'streaks': 'gamification',
};

// Sorted page target keys: longest first for multi-word matching
const SORTED_PAGE_TARGETS = Object.keys(PAGE_TARGETS).sort((a, b) => b.length - a.length);

// ─── Cache refresh interval ─────────────────────────────────

const CACHE_REFRESH_MS = 60 * 60 * 1000; // 1 hour

export class VoiceIntentService {
  private knownCities: string[] = [];
  private knownArtistNames: string[] = [];
  private citiesCacheTime = 0;
  private artistNamesCacheTime = 0;

  // ─── Cache loaders ──────────────────────────────────────

  private async loadCities(): Promise<void> {
    if (Date.now() - this.citiesCacheTime < CACHE_REFRESH_MS && this.knownCities.length > 0) return;

    const cities = await db('artist_profiles')
      .distinct('base_city')
      .whereNotNull('base_city')
      .pluck('base_city');
    this.knownCities = cities.map((c: string) => c.toLowerCase());
    this.citiesCacheTime = Date.now();
  }

  private async loadArtistNames(): Promise<void> {
    if (Date.now() - this.artistNamesCacheTime < CACHE_REFRESH_MS && this.knownArtistNames.length > 0) return;

    const names = await db('artist_profiles')
      .distinct('stage_name')
      .whereNotNull('stage_name')
      .pluck('stage_name');
    this.knownArtistNames = names.map((n: string) => n.toLowerCase());
    this.artistNamesCacheTime = Date.now();
  }

  // ─── Main parser ────────────────────────────────────────

  async parseQuery(text: string): Promise<VoiceParsedIntent> {
    await this.loadCities();
    await this.loadArtistNames();

    const lower = text.toLowerCase().replace(/\s+/g, ' ').trim();

    // 1. Detect intent (longest match first for multi-word keywords)
    let bestIntent = 'unknown';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(SORTED_INTENT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          // Multi-word keywords count more
          score += kw.split(' ').length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // 2. Extract entities
    const entities: VoiceParsedIntent['entities'] = {};

    // City detection
    for (const city of this.knownCities) {
      if (lower.includes(city)) {
        entities.city = city;
        break;
      }
    }

    // Date extraction
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        entities.date = match[0];
        break;
      }
    }

    // Budget extraction
    for (const pattern of BUDGET_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        let amount = Number(match[1].replace(/,/g, ''));
        if (/k/i.test(text.slice(match.index))) amount *= 1000;
        if (/lakh|lac|L/i.test(text.slice(match.index))) amount *= 100000;
        entities.budget = amount;
        break;
      }
    }

    // Event type detection (Hinglish first, then English)
    for (const [hinglish, english] of Object.entries(HINGLISH_EVENT_MAP)) {
      if (lower.includes(hinglish)) {
        entities.event_type = english;
        break;
      }
    }
    if (!entities.event_type) {
      for (const eventType of ENGLISH_EVENT_TYPES) {
        if (lower.includes(eventType)) {
          entities.event_type = eventType;
          break;
        }
      }
    }

    // Genre detection
    for (const genre of GENRE_KEYWORDS) {
      if (lower.includes(genre)) {
        entities.genre = genre;
        break;
      }
    }

    // Artist name detection
    for (const name of this.knownArtistNames) {
      if (lower.includes(name)) {
        entities.artist_name = name;
        break;
      }
    }

    // Booking ID extraction
    const uuidMatch = text.match(UUID_PATTERN);
    if (uuidMatch) {
      entities.booking_id = uuidMatch[0];
      if (bestIntent === 'unknown') bestIntent = 'STATUS';
    }

    // Action verb extraction (for ACTION intent)
    if (bestIntent === 'ACTION') {
      for (const verb of ACTION_VERBS) {
        if (lower.includes(verb)) {
          entities.action_verb = verb;
          break;
        }
      }
    }

    // Page target extraction (for NAVIGATE intent)
    for (const key of SORTED_PAGE_TARGETS) {
      if (lower.includes(key)) {
        entities.page_target = PAGE_TARGETS[key];
        // If we found a page target and intent is unknown, default to NAVIGATE
        if (bestIntent === 'unknown') {
          bestIntent = 'NAVIGATE';
          bestScore = Math.max(bestScore, 1);
        }
        break;
      }
    }

    // 3. Compute confidence
    const entityCount = Object.keys(entities).length;
    const confidence = bestIntent === 'unknown'
      ? Math.min(0.1 + entityCount * 0.05, 0.3)
      : Math.min(0.3 + bestScore * 0.15 + entityCount * 0.05, 0.95);

    return {
      intent: bestIntent,
      entities,
      confidence,
      raw_text: text,
    };
  }
}

export const voiceIntentService = new VoiceIntentService();
