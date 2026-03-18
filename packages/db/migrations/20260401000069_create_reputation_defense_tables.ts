import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('review_disputes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('review_id').notNullable().references('id').inTable('reviews');
    table.uuid('disputed_by').notNullable().references('id').inTable('users');
    table.text('reason').notNullable();
    table.jsonb('evidence_urls').notNullable().defaultTo('[]');
    table.string('status', 20).notNullable().defaultTo('submitted');
    table.text('admin_notes').nullable();
    table.string('resolution', 20).nullable();
    table.uuid('resolved_by').nullable().references('id').inTable('users');
    table.timestamp('resolved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_rd_review ON review_disputes (review_id)');
  await knex.raw('CREATE INDEX idx_rd_disputed_by ON review_disputes (disputed_by)');
  await knex.raw('CREATE INDEX idx_rd_status ON review_disputes (status)');

  await knex.schema.createTable('venue_issue_flags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable().references('id').inTable('venue_profiles');
    table.uuid('booking_id').nullable().references('id').inTable('bookings');
    table.string('issue_type', 100).notNullable();
    table.text('description').notNullable();
    table.uuid('flagged_by').notNullable().references('id').inTable('users');
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.uuid('verified_by').nullable().references('id').inTable('users');
    table.text('auto_advisory').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_vif_venue ON venue_issue_flags (venue_id)');
  await knex.raw('CREATE INDEX idx_vif_venue_verified ON venue_issue_flags (venue_id, is_verified)');

  await knex.schema.createTable('venue_review_weights', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable().references('id').inTable('venue_profiles');
    table.uuid('review_id').notNullable().references('id').inTable('reviews');
    table.decimal('weight', 3, 2).notNullable().defaultTo(1.00);
    table.string('weight_reason', 255).nullable();
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['venue_id', 'review_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_review_weights');
  await knex.schema.dropTableIfExists('venue_issue_flags');
  await knex.schema.dropTableIfExists('review_disputes');
}
