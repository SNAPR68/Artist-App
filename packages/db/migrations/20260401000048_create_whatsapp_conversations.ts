import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('whatsapp_conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('phone_number', 20).notNullable().unique();
    table.uuid('user_id').nullable().references('id').inTable('users');
    table.specificType('current_intent', 'whatsapp_intent_type').nullable();
    table.jsonb('conversation_state').notNullable().defaultTo('{}');
    table.timestamp('last_message_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_wa_conv_user ON whatsapp_conversations (user_id)');
  await knex.raw('CREATE INDEX idx_wa_conv_active ON whatsapp_conversations (is_active, last_message_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('whatsapp_conversations');
}
