/**
 * Anthropic tool definitions for Zara.
 *
 * These are the tools Claude can call during a conversation turn.
 * Each one wraps an existing GRID backend API — no duplicate logic.
 *
 * Keep descriptions PRECISE and OUTCOME-ORIENTED. Claude uses the
 * description to decide when to call — vague descriptions lead to
 * unnecessary calls (= cost).
 */
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const TOOLS: Tool[] = [
  {
    name: 'search_artists',
    description:
      'Search the GRID artist catalog. Use when the user asks for specific artists or a category (e.g. "show me DJs in Mumbai", "find a Punjabi singer"). Do NOT use for full event briefs — use parse_brief for those. Returns up to 5 top matches.',
    input_schema: {
      type: 'object' as const,
      properties: {
        q: {
          type: 'string',
          description: 'Free-text query — artist type, genre, or name (e.g. "DJ", "Punjabi singer", "stand-up comedian")',
        },
        city: {
          type: 'string',
          description: 'Indian city (e.g. "Mumbai", "Delhi", "Bangalore")',
        },
        genre: {
          type: 'string',
          description: 'Music/performance genre (e.g. "bollywood", "punjabi", "edm", "rock")',
        },
        budget_min_paise: {
          type: 'integer',
          description: 'Minimum budget in paise (1 rupee = 100 paise). Example: ₹50,000 = 5000000',
        },
        budget_max_paise: {
          type: 'integer',
          description: 'Maximum budget in paise',
        },
      },
      required: [],
    },
  },
  {
    name: 'parse_brief',
    description:
      "Parse a full event brief and get GRID's ranked artist recommendations. Use when the user describes an event (date, city, guest count, budget, vibe) and wants recommendations. This uses GRID's 7-dimension scoring engine. Prefer this over search_artists for anything that looks like a complete event description.",
    input_schema: {
      type: 'object' as const,
      properties: {
        raw_text: {
          type: 'string',
          description: "The user's event description, verbatim if possible",
        },
      },
      required: ['raw_text'],
    },
  },
  {
    name: 'get_artist_details',
    description:
      'Fetch full details for a specific artist by ID (bio, portfolio, pricing, reviews, availability hints). Use when the user asks about a specific artist you already know the ID for (from a previous search_artists or parse_brief result).',
    input_schema: {
      type: 'object' as const,
      properties: {
        artist_id: {
          type: 'string',
          description: 'The artist UUID from a previous tool result',
        },
      },
      required: ['artist_id'],
    },
  },
  {
    name: 'get_pricing_guide',
    description:
      "Get GRID's market pricing guide for a category in a city — percentile ranges, typical all-in fees, seasonal variance. Use when the user asks 'how much does X cost' or needs help setting budget expectations.",
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Artist category (e.g. "dj", "singer", "band", "comedian")',
        },
        city: {
          type: 'string',
          description: 'Indian city',
        },
        event_type: {
          type: 'string',
          description: 'Event type (e.g. "wedding", "corporate", "college_fest") — optional',
        },
      },
      required: ['category'],
    },
  },
];
