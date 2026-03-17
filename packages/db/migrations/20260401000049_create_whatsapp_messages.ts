import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('whatsapp_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('whatsapp_conversations').onDelete('CASCADE');
    table.specificType('direction', 'whatsapp_message_direction').notNullable();
    table.string('message_type', 50).notNullable().defaultTo('text');
    table.text('content').notNullable();
    table.specificType('parsed_intent', 'whatsapp_intent_type').nullable();
    table.jsonb('parsed_entities').nullable();
    table.string('provider_message_id', 200).nullable();
    table.string('status', 50).notNullable().defaultTo('sent');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_wa_msg_conv ON whatsapp_messages (conversation_id, created_at)');
  await knex.raw('CREATE INDEX idx_wa_msg_provider ON whatsapp_messages (provider_message_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('whatsapp_messages');
}
