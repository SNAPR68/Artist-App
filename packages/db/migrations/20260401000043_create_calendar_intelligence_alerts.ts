import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('calendar_intelligence_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('alert_type', 50).notNullable();
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.boolean('is_actionable').notNullable().defaultTo(true);
    table.string('action_url', 500).nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_cal_alerts_artist_read ON calendar_intelligence_alerts (artist_id, is_read)');
  await knex.raw('CREATE INDEX idx_cal_alerts_artist_type ON calendar_intelligence_alerts (artist_id, alert_type)');
  await knex.raw('CREATE INDEX idx_cal_alerts_expires ON calendar_intelligence_alerts (expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('calendar_intelligence_alerts');
}
