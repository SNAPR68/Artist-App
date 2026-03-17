import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rider_line_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('rider_id').notNullable().references('id').inTable('artist_riders').onDelete('CASCADE');
    table.specificType('category', 'rider_item_category').notNullable();
    table.string('item_name', 200).notNullable();
    table.integer('quantity').notNullable().defaultTo(1);
    table.specificType('priority', 'rider_priority').notNullable();
    table.text('specifications').nullable();
    table.specificType('alternatives', 'text[]').notNullable().defaultTo('{}');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_rider_items_rider_cat ON rider_line_items (rider_id, category)');
  await knex.raw('CREATE INDEX idx_rider_items_priority ON rider_line_items (rider_id, priority)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rider_line_items');
}
