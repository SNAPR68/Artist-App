import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('substitution_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('original_booking_id').notNullable().references('id').inTable('bookings');
    table.uuid('cancelled_artist_id').notNullable().references('id').inTable('artist_profiles');
    table.uuid('requested_by').notNullable().references('id').inTable('users');
    table.string('urgency_level', 20).notNullable();
    table.date('event_date').notNullable();
    table.string('event_city', 100).notNullable();
    table.string('event_type', 50).notNullable();
    table.jsonb('genres').notNullable().defaultTo('[]');
    table.bigInteger('budget_paise').notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamp('matched_at').nullable();
    table.uuid('accepted_artist_id').nullable().references('id').inTable('artist_profiles');
    table.uuid('new_booking_id').nullable().references('id').inTable('bookings');
    table.decimal('premium_multiplier', 5, 2).notNullable().defaultTo(1.25);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_sr_booking ON substitution_requests (original_booking_id)');
  await knex.raw('CREATE INDEX idx_sr_status ON substitution_requests (status)');
  await knex.raw('CREATE INDEX idx_sr_expires ON substitution_requests (expires_at)');

  await knex.schema.createTable('substitution_candidates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('request_id').notNullable().references('id').inTable('substitution_requests').onDelete('CASCADE');
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles');
    table.decimal('similarity_score', 5, 3).notNullable();
    table.jsonb('score_breakdown').notNullable();
    table.boolean('is_reliable_backup').notNullable().defaultTo(false);
    table.bigInteger('quoted_amount_paise').nullable();
    table.string('response', 20).notNullable().defaultTo('pending');
    table.timestamp('responded_at').nullable();
    table.text('decline_reason').nullable();
    table.timestamp('notified_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_sc_request ON substitution_candidates (request_id)');
  await knex.raw('CREATE INDEX idx_sc_artist ON substitution_candidates (artist_id)');
  await knex.raw('CREATE INDEX idx_sc_response ON substitution_candidates (response)');

  await knex.schema.alterTable('artist_profiles', (table) => {
    table.boolean('is_reliable_backup').notNullable().defaultTo(false);
    table.integer('backup_premium_pct').notNullable().defaultTo(25);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_profiles', (table) => {
    table.dropColumn('is_reliable_backup');
    table.dropColumn('backup_premium_pct');
  });

  await knex.schema.dropTableIfExists('substitution_candidates');
  await knex.schema.dropTableIfExists('substitution_requests');
}
