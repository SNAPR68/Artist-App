import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_bank_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('account_holder_name', 200).notNullable();
    table.text('account_number_encrypted').notNullable();
    table.string('ifsc_code', 11).notNullable();
    table.string('bank_name', 200).notNullable();
    table.text('upi_id_encrypted').nullable();
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.boolean('is_primary').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['artist_id']);
  });

  // Only one primary account per artist
  await knex.raw(`
    CREATE UNIQUE INDEX artist_bank_accounts_one_primary
    ON artist_bank_accounts (artist_id)
    WHERE is_primary = true;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_bank_accounts');
}
