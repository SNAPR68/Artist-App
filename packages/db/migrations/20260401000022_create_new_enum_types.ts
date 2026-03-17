import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE dispute_type AS ENUM (
      'partial_performance', 'no_show', 'equipment_failure',
      'quality_complaint', 'payment_dispute', 'force_majeure'
    );
  `);
  await knex.raw(`
    CREATE TYPE dispute_status AS ENUM (
      'submitted', 'evidence_collection', 'under_review',
      'resolved', 'appealed', 'closed'
    );
  `);
  await knex.raw(`
    CREATE TYPE resolution_type AS ENUM (
      'full_refund', 'partial_refund', 'no_refund',
      'rebooking', 'mediated_agreement'
    );
  `);
  await knex.raw(`
    CREATE TYPE cancellation_sub_type AS ENUM (
      'by_client', 'by_artist', 'force_majeure', 'by_platform'
    );
  `);
  await knex.raw(`
    CREATE TYPE payout_status AS ENUM (
      'pending', 'initiated', 'completed', 'failed'
    );
  `);
  await knex.raw(`
    CREATE TYPE transfer_method AS ENUM (
      'bank_transfer', 'upi', 'manual'
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  const types = [
    'transfer_method', 'payout_status', 'cancellation_sub_type',
    'resolution_type', 'dispute_status', 'dispute_type',
  ];
  for (const t of types) {
    await knex.raw(`DROP TYPE IF EXISTS ${t} CASCADE`);
  }
}
