import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS price_intelligence_v2 AS
    SELECT
      b.event_type,
      b.event_city,
      ap.genres[1] as primary_genre,
      COUNT(*)::int as sample_size,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY b.final_amount_paise) as p25_paise,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.final_amount_paise) as median_paise,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.final_amount_paise) as p75_paise,
      AVG(b.final_amount_paise)::bigint as avg_paise,
      MIN(b.final_amount_paise) as min_paise,
      MAX(b.final_amount_paise) as max_paise,
      -- Trust tier breakdown
      AVG(CASE WHEN ap.trust_score >= 80 THEN b.final_amount_paise END)::bigint as high_trust_avg_paise,
      AVG(CASE WHEN ap.trust_score >= 50 AND ap.trust_score < 80 THEN b.final_amount_paise END)::bigint as mid_trust_avg_paise,
      AVG(CASE WHEN ap.trust_score < 50 THEN b.final_amount_paise END)::bigint as low_trust_avg_paise,
      -- Temporal trend (recent 3 months vs prior)
      AVG(CASE WHEN b.event_date >= CURRENT_DATE - INTERVAL '90 days' THEN b.final_amount_paise END)::bigint as recent_avg_paise,
      AVG(CASE WHEN b.event_date < CURRENT_DATE - INTERVAL '90 days' THEN b.final_amount_paise END)::bigint as prior_avg_paise
    FROM bookings b
    JOIN artist_profiles ap ON ap.id = b.artist_id
    WHERE b.state IN ('completed', 'settled')
      AND b.final_amount_paise IS NOT NULL
      AND b.final_amount_paise > 0
    GROUP BY b.event_type, b.event_city, ap.genres[1]
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_price_intelligence_v2_lookup
    ON price_intelligence_v2 (event_type, event_city, primary_genre)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS price_intelligence_v2');
}
