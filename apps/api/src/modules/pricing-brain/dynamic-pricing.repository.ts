import { db } from '../../infrastructure/database.js';

export class DynamicPricingRepository {
  // ─── Artist Price Rules ─────────────────────────────────────

  async getArtistRules(artistId: string) {
    return db('artist_price_rules')
      .where({ artist_id: artistId, is_active: true })
      .orderBy('created_at');
  }

  async getAllRules(artistId: string) {
    return db('artist_price_rules')
      .where({ artist_id: artistId })
      .orderBy('created_at');
  }

  async createRule(data: {
    artist_id: string;
    rule_type: string;
    conditions: Record<string, unknown>;
    action: Record<string, unknown>;
    max_adjustment_pct?: number;
    min_price_paise?: number;
    event_types?: string[];
    cities?: string[];
  }) {
    const [row] = await db('artist_price_rules')
      .insert({
        ...data,
        conditions: JSON.stringify(data.conditions),
        action: JSON.stringify(data.action),
        event_types: data.event_types ? JSON.stringify(data.event_types) : null,
        cities: data.cities ? JSON.stringify(data.cities) : null,
      })
      .returning('*');
    return row;
  }

  async updateRule(ruleId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.conditions) updateData.conditions = JSON.stringify(data.conditions);
    if (data.action) updateData.action = JSON.stringify(data.action);
    if (data.event_types) updateData.event_types = JSON.stringify(data.event_types);
    if (data.cities) updateData.cities = JSON.stringify(data.cities);

    const [row] = await db('artist_price_rules')
      .where({ id: ruleId })
      .update(updateData)
      .returning('*');
    return row;
  }

  async deleteRule(ruleId: string) {
    return db('artist_price_rules')
      .where({ id: ruleId })
      .del();
  }

  async getRuleById(ruleId: string) {
    return db('artist_price_rules')
      .where({ id: ruleId })
      .first();
  }

  // ─── Price Elasticity Log ───────────────────────────────────

  async logElasticity(data: {
    artist_id: string;
    booking_id?: string;
    event_type: string;
    city: string;
    event_date: string;
    base_price_paise: number;
    quoted_price_paise: number;
    surge_pct: number;
    demand_level: string;
    outcome: string;
  }) {
    const [row] = await db('price_elasticity_log')
      .insert(data)
      .returning('*');
    return row;
  }

  async getElasticityData(
    artistId: string,
    filters?: { demand_level?: string; outcome?: string },
  ) {
    let query = db('price_elasticity_log')
      .where({ artist_id: artistId });

    if (filters?.demand_level) {
      query = query.where('demand_level', filters.demand_level);
    }
    if (filters?.outcome) {
      query = query.where('outcome', filters.outcome);
    }

    return query.orderBy('created_at', 'desc').limit(100);
  }

  // ─── Dynamic Price Cache ────────────────────────────────────

  async upsertPriceCache(data: {
    artist_id: string;
    event_type: string;
    city: string;
    event_date: string;
    base_min_paise: number;
    base_max_paise: number;
    adjusted_min_paise: number;
    adjusted_max_paise: number;
    demand_level: string;
    adjustments_applied: Record<string, unknown>[];
    expires_at: Date;
  }) {
    const insertData = {
      ...data,
      adjustments_applied: JSON.stringify(data.adjustments_applied),
    };

    const [row] = await db('dynamic_price_cache')
      .insert(insertData)
      .onConflict(['artist_id', 'event_type', 'city', 'event_date'])
      .merge()
      .returning('*');
    return row;
  }

  async getCachedPrice(
    artistId: string,
    eventType: string,
    city: string,
    eventDate: string,
  ) {
    return db('dynamic_price_cache')
      .where({
        artist_id: artistId,
        event_type: eventType,
        city: city,
        event_date: eventDate,
      })
      .where('expires_at', '>', new Date())
      .first();
  }

  async cleanExpiredCache() {
    const count = await db('dynamic_price_cache')
      .where('expires_at', '<', new Date())
      .del();
    return count;
  }

  // ─── Utility ────────────────────────────────────────────────

  async getArtistsWithActiveRules(): Promise<string[]> {
    const rows = await db('artist_price_rules')
      .where({ is_active: true })
      .distinct('artist_id')
      .select('artist_id');
    return rows.map((r: Record<string, unknown>) => r.artist_id as string);
  }
}

export const dynamicPricingRepository = new DynamicPricingRepository();
