/**
 * Event Company OS pivot (2026-04-22) — EPK (Electronic Press Kit) artifacts.
 *
 * EPK = a bundled artist press kit with 4 renderables:
 *   - pdf_url  : brand PDF (bio, stats, gallery, contact) — Nocturne Hollywood
 *   - xlsx_url : stats + past bookings sheet
 *   - pptx_url : pitch deck (cover, bio, stats, gallery, CTA)
 *   - mp4_url  : short highlight reel (ffmpeg-concatenated media with crossfade)
 *
 * Two sources:
 *   'generated' — produced in-process from artist_profile + media + IG snapshot
 *   'uploaded'  — vendor re-uploads their own deck/reel as the file-of-record
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('epk_artifacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('vendor_profile_id').notNullable()
      .references('id').inTable('artist_profiles').onDelete('CASCADE');
    t.uuid('created_by_user_id').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    t.enu('source', ['generated', 'uploaded'], {
      useNative: true,
      enumName: 'epk_artifact_source',
    }).notNullable();

    t.text('pdf_url').nullable();
    t.text('xlsx_url').nullable();
    t.text('pptx_url').nullable();
    t.text('mp4_url').nullable();

    t.text('pdf_s3_key').nullable();
    t.text('xlsx_s3_key').nullable();
    t.text('pptx_s3_key').nullable();
    t.text('mp4_s3_key').nullable();

    // Snapshot of the inputs used at generation time so a later regen can
    // diff against what the artist has published since.
    t.integer('media_item_count').nullable();
    t.integer('follower_count_snapshot').nullable();
    t.string('ig_username_snapshot', 64).nullable();

    t.text('note').nullable();

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('vendor_profile_id');
    t.index(['vendor_profile_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('epk_artifacts');
  await knex.raw('DROP TYPE IF EXISTS epk_artifact_source');
}
