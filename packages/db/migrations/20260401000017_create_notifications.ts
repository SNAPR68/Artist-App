import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('type', 50).notNullable();
    table.string('title', 200).notNullable();
    table.text('body');
    table.jsonb('data');
    table.string('channel', 20);
    table.timestamp('read_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'read_at']);
  });

  await knex.schema.createTable('notification_preferences', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users');
    table.boolean('whatsapp').notNullable().defaultTo(true);
    table.boolean('sms').notNullable().defaultTo(true);
    table.boolean('push').notNullable().defaultTo(true);
    table.boolean('email').notNullable().defaultTo(false);
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('fcm_token', 500).notNullable();
    table.string('platform', 20);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.unique(['user_id', 'fcm_token']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_devices');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');
}
