import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dispute_evidence', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    table.uuid('submitted_by').notNullable().references('id').inTable('users');
    table.string('evidence_type', 50).notNullable();
    table.string('file_url', 2048).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['dispute_id']);
    table.index(['submitted_by']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dispute_evidence');
}
