/**
 * Event Company OS pivot (2026-04-22) — Instagram OAuth (Option A, IG Business API).
 *
 * Per-vendor Instagram Business/Creator account connection.
 *   - access_token_encrypted: long-lived page access token (60-day TTL)
 *   - ig_user_id / ig_username: resolved via /me?fields=instagram_business_account
 *   - fb_page_id: the Facebook Page linked to the IG Business account
 *   - follower_count / media_count: snapshot for display, refreshed on sync
 *
 * Meta app review is submitted Day 1 Sprint A; scopes assumed:
 *   instagram_basic, instagram_manage_insights, pages_show_list,
 *   pages_read_engagement, business_management.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('instagram_connections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // Points at artist_profiles.id (= vendor row under the pivot shortcut).
    t.uuid('vendor_profile_id').notNullable().unique()
      .references('id').inTable('artist_profiles').onDelete('CASCADE');
    t.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    t.text('access_token_encrypted').notNullable();
    t.timestamp('access_token_expires_at').notNullable();

    t.text('fb_user_id').notNullable();
    t.text('fb_page_id').notNullable();
    t.text('ig_user_id').notNullable();
    t.string('ig_username', 64).notNullable();

    t.integer('follower_count').nullable();
    t.integer('follows_count').nullable();
    t.integer('media_count').nullable();
    t.text('profile_picture_url').nullable();
    t.text('biography').nullable();

    t.timestamp('last_synced_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index('vendor_profile_id');
    t.index('ig_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('instagram_connections');
}
