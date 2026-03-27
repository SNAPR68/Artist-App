import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('instabook_interests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('role', 20).notNullable(); // artist | event_company | client | agent
    table.string('name', 200).notNullable();
    table.string('phone', 20).notNullable();
    table.string('email', 200).nullable();
    table.string('city', 100).notNullable();
    table.smallint('excitement_score').notNullable(); // 1-5
    table.text('top_concern').nullable();
    table.string('would_use_first_month', 10).notNullable(); // yes | no | maybe
    table.jsonb('role_specific_data').notNullable().defaultTo('{}');
    table.string('source', 20).notNullable().defaultTo('web'); // web | voice_en | voice_hi
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    table.index(['phone']);
    table.index(['created_at']);
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('instabook_interests');
}
