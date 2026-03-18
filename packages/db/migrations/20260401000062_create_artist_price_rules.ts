import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_price_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('rule_type', 50).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('conditions').notNullable();
    table.jsonb('action').notNullable();
    table.decimal('max_adjustment_pct', 5, 2).nullable();
    table.bigInteger('min_price_paise').nullable();
    table.specificType('event_types', 'text[]').nullable();
    table.specificType('cities', 'text[]').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_apr_artist ON artist_price_rules (artist_id)');
  await knex.raw('CREATE INDEX idx_apr_active ON artist_price_rules (artist_id, is_active)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_price_rules');
}
