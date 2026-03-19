import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('gig_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('posted_by').notNullable().references('id').inTable('users');
    table.uuid('workspace_id').nullable().references('id').inTable('workspaces');
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.string('event_type', 50).notNullable();
    table.date('event_date').notNullable();
    table.string('event_city', 100).notNullable();
    table.jsonb('genres_needed').notNullable().defaultTo('[]');
    table.bigInteger('budget_min_paise').notNullable();
    table.bigInteger('budget_max_paise').notNullable();
    table.integer('guest_count').nullable();
    table.decimal('duration_hours', 4, 1).nullable();
    table.text('requirements').nullable();
    table.string('status', 20).notNullable().defaultTo('open');
    table.integer('application_count').notNullable().defaultTo(0);
    table.uuid('booking_id').nullable().references('id').inTable('bookings');
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_gig_posts_posted_by ON gig_posts (posted_by)');
  await knex.raw('CREATE INDEX idx_gig_posts_status ON gig_posts (status)');
  await knex.raw('CREATE INDEX idx_gig_posts_city_status ON gig_posts (event_city, status)');
  await knex.raw('CREATE INDEX idx_gig_posts_event_date ON gig_posts (event_date)');
  await knex.raw('CREATE INDEX idx_gig_posts_status_date ON gig_posts (status, event_date)');

  await knex.schema.createTable('gig_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('gig_post_id').notNullable().references('id').inTable('gig_posts').onDelete('CASCADE');
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles');
    table.text('cover_note').nullable();
    table.bigInteger('proposed_amount_paise').nullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamp('responded_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['gig_post_id', 'artist_id']);
  });

  await knex.raw('CREATE INDEX idx_gig_apps_post ON gig_applications (gig_post_id)');
  await knex.raw('CREATE INDEX idx_gig_apps_artist ON gig_applications (artist_id)');
  await knex.raw('CREATE INDEX idx_gig_apps_status ON gig_applications (status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gig_applications');
  await knex.schema.dropTableIfExists('gig_posts');
}
