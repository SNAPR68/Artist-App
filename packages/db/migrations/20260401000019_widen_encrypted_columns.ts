import type { Knex } from 'knex';

/**
 * Widen phone and email columns to accommodate AES-256-GCM encrypted values.
 * The original varchar(15) for phone can't hold the encrypted ciphertext.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone', 512).notNullable().alter();
    table.string('email', 512).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone', 15).notNullable().alter();
    table.string('email', 255).nullable().alter();
  });
}
