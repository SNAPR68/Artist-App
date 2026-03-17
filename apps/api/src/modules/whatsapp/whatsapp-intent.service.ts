/**
 * Rule-based intent parser for WhatsApp messages.
 * v1: Keyword matching in Hindi/English + regex entity extraction.
 */

import { db } from '../../infrastructure/database.js';

interface ParsedIntent {
  intent: string;
  entities: {
    city?: string;
    date?: string;
    genre?: string;
    budget?: number;
    artist_name?: string;
    booking_id?: string;
  };
  confidence: number;
}

// Keyword → intent mapping
const INTENT_KEYWORDS: Record<string, string[]> = {
  search_artist: [
    'book', 'artist', 'singer', 'band', 'dj', 'musician', 'performer',
    'looking for', 'need a', 'find', 'suggest',
    'chahiye', 'dhundh', 'singer chahiye', 'artist chahiye',
  ],
  check_availability: [
    'available', 'free', 'date check', 'availability',
    'khali', 'free hai', 'milega',
  ],
  get_quote: [
    'price', 'cost', 'rate', 'quote', 'charges', 'fees', 'how much',
    'kitna', 'kharcha', 'paisa', 'budget', 'amount',
  ],
  check_status: [
    'status', 'booking status', 'update', 'kahan tak', 'kya hua',
    'progress', 'confirm', 'confirmed',
  ],
};

// Date patterns
const DATE_PATTERNS = [
  // YYYY-MM-DD
  /(\d{4}-\d{2}-\d{2})/,
  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  // "25th March", "March 25"
  /(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i,
  /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
];

// Budget patterns
const BUDGET_PATTERNS = [
  /(\d+)\s*(?:k|K)/, // 50k
  /(\d+)\s*(?:lakh|lac|L)/i, // 1 lakh
  /(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i, // ₹50000
  /(\d{4,})\s*(?:rupees?)?/i, // 50000
];

// UUID pattern for booking IDs
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export class WhatsAppIntentService {
  private knownCities: string[] = [];

  async initialize() {
    // Cache known cities from artist profiles
    const cities = await db('artist_profiles')
      .distinct('base_city')
      .whereNotNull('base_city')
      .pluck('base_city');
    this.knownCities = cities.map((c: string) => c.toLowerCase());
  }

  async parseMessage(text: string): Promise<ParsedIntent> {
    if (this.knownCities.length === 0) {
      await this.initialize();
    }

    const lower = text.toLowerCase().trim();

    // Detect intent from keywords
    let bestIntent = 'unknown';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // Extract entities
    const entities: ParsedIntent['entities'] = {};

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

    // Booking ID extraction
    const uuidMatch = text.match(UUID_PATTERN);
    if (uuidMatch) {
      entities.booking_id = uuidMatch[0];
      if (bestIntent === 'unknown') bestIntent = 'check_status';
    }

    const confidence = bestIntent === 'unknown' ? 0.1 : Math.min(0.3 + bestScore * 0.2, 0.95);

    return { intent: bestIntent, entities, confidence };
  }
}

export const whatsAppIntentService = new WhatsAppIntentService();
