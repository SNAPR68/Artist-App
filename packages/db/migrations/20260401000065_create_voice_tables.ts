import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('voice_conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.jsonb('session_state').notNullable().defaultTo('{}');
    table.string('current_intent', 50).nullable();
    table.jsonb('conversation_memory').notNullable().defaultTo('[]');
    table.jsonb('context_enrichment').notNullable().defaultTo('{}');
    table.timestamp('last_message_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_vc_user ON voice_conversations (user_id)');
  await knex.raw('CREATE INDEX idx_vc_active ON voice_conversations (is_active)');

  await knex.schema.createTable('voice_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('voice_conversations').onDelete('CASCADE');
    table.string('direction', 10).notNullable();
    table.text('raw_text').notNullable();
    table.string('parsed_intent', 50).nullable();
    table.jsonb('parsed_entities').notNullable().defaultTo('[]');
    table.decimal('confidence', 5, 3).nullable();
    table.jsonb('execution_result').nullable();
    table.text('response_text').nullable();
    table.integer('processing_time_ms').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_vm_conversation ON voice_messages (conversation_id)');
  await knex.raw('CREATE INDEX idx_vm_created ON voice_messages (created_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('voice_messages');
  await knex.schema.dropTableIfExists('voice_conversations');
}
