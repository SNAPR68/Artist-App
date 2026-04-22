/**
 * Event Company OS pivot (2026-04-22) — Outbound voice call scripts.
 *
 * Per-category opening line for each purpose. Kept as plain TS (not DB rows)
 * so they're reviewable in diffs and deploy atomically with code. Hinglish-
 * friendly phrasing matches the assistant personas (Zara/Kabir). Fields:
 *   {vendor_name}, {event_name}, {event_date}, {city}, {call_time}
 */
export type OutboundCategory =
  | 'artist'
  | 'av'
  | 'photo'
  | 'decor'
  | 'license'
  | 'promoters'
  | 'transport';

export type OutboundPurpose =
  | 'availability'
  | 'call_sheet_confirm'
  | 'day_of_checkin'
  | 'rider_confirm';

type ScriptMap = Record<OutboundPurpose, Partial<Record<OutboundCategory, string>>>;

const availability: Record<OutboundCategory, string> = {
  artist:
    "Hi {vendor_name}, this is GRID calling on behalf of the event company. They're planning {event_name} on {event_date} in {city}. Are you free to perform that night? Just say yes, no, or tell me if the date's tricky.",
  av:
    "Hi {vendor_name}, GRID here calling for the event company. They need full AV — sound, lights, stage — for {event_name} on {event_date} in {city}. Is your crew and gear available? Any equipment conflicts that week?",
  photo:
    "Hi {vendor_name}, this is GRID. The event company is planning {event_name} on {event_date} in {city} and wants you on the shoot. Are you available? Do you bring your own second shooter or would you need us to arrange one?",
  decor:
    "Hi {vendor_name}, GRID calling for the event company. They need decor and stage design for {event_name} on {event_date} in {city}. Can you take this one? And what's the earliest you'd need the venue for setup?",
  license:
    "Hi {vendor_name}, this is GRID. The event company is putting on {event_name} on {event_date} in {city} and needs music licensing handled. Can you cover it? Any permits that typically take more than 10 days for {city}?",
  promoters:
    "Hi {vendor_name}, GRID here. The event company is launching {event_name} on {event_date} in {city} and wants you handling promotions. Are you open that cycle? What's your lead time to ramp reach?",
  transport:
    "Hi {vendor_name}, this is GRID calling for the event company. They need artist and crew transport for {event_name} on {event_date} in {city}. Can you cover pickups and drop-offs? How many vehicles can you guarantee on short notice?",
};

const callSheetConfirm: Partial<Record<OutboundCategory, string>> = {
  artist:
    "Hi {vendor_name}, GRID here. Just confirming your call time for {event_name} — {call_time} on {event_date} in {city}. Can you confirm you've got the call sheet? Anything unclear?",
  av:
    "Hi {vendor_name}, GRID. Confirming {event_name} — AV load-in at {call_time} on {event_date} in {city}. Your gear list match what's on the call sheet? Any missing items?",
  photo:
    "Hi {vendor_name}, GRID here. Call time for {event_name} is {call_time} on {event_date} in {city}. You're set, right? Need the shot list again?",
  decor:
    "Hi {vendor_name}, this is GRID. Setup begins at {call_time} on {event_date} in {city} for {event_name}. Your crew confirmed? Venue access arranged?",
  promoters:
    "Hi {vendor_name}, GRID. For {event_name} on {event_date} in {city} — briefing is at {call_time}. You have the campaign brief?",
  transport:
    "Hi {vendor_name}, GRID here. First pickup is {call_time} on {event_date} in {city} for {event_name}. Drivers and vehicles locked? Contact numbers current?",
};

const dayOfCheckin: Partial<Record<OutboundCategory, string>> = {
  artist:
    "Hi {vendor_name}, GRID here on event day. Are you en route to {city} for {event_name}? ETA to venue?",
  av:
    "Hi {vendor_name}, GRID calling. How's load-in going for {event_name}? Any gear issues we need to flag to the event company?",
  photo:
    "Hi {vendor_name}, GRID. Quick check — are you at the venue for {event_name}? Memory cards, batteries, backup gear — all set?",
  decor:
    "Hi {vendor_name}, GRID here. Where are you with setup for {event_name}? On track for the call time?",
  transport:
    "Hi {vendor_name}, GRID. Confirming driver and vehicle status for {event_name} pickups today. Any delays or vehicle swaps?",
};

const riderConfirm: Partial<Record<OutboundCategory, string>> = {
  artist:
    "Hi {vendor_name}, GRID here. We're finalizing the tech rider for {event_name}. Any last additions or changes to your rider before we lock it with AV?",
  av:
    "Hi {vendor_name}, GRID. The artist rider for {event_name} is attached. Can your gear meet every line? Anything you'd need to sub-rent?",
};

export const SCRIPTS: ScriptMap = {
  availability,
  call_sheet_confirm: callSheetConfirm,
  day_of_checkin: dayOfCheckin,
  rider_confirm: riderConfirm,
};

export interface ScriptContext {
  vendor_name: string;
  event_name?: string;
  event_date?: string;
  city?: string;
  call_time?: string;
}

export function renderScript(
  category: OutboundCategory,
  purpose: OutboundPurpose,
  ctx: ScriptContext,
): string | null {
  const template = SCRIPTS[purpose]?.[category];
  if (!template) return null;
  return template
    .replace(/\{vendor_name\}/g, ctx.vendor_name)
    .replace(/\{event_name\}/g, ctx.event_name ?? 'the event')
    .replace(/\{event_date\}/g, ctx.event_date ?? 'the date')
    .replace(/\{city\}/g, ctx.city ?? 'your city')
    .replace(/\{call_time\}/g, ctx.call_time ?? 'the scheduled time');
}

export function supports(category: string, purpose: string): boolean {
  return (
    category in availability &&
    !!SCRIPTS[purpose as OutboundPurpose]?.[category as OutboundCategory]
  );
}
