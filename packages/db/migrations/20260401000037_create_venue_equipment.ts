import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venue_equipment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable().references('id').inTable('venue_profiles').onDelete('CASCADE');
    table.specificType('category', 'rider_item_category').notNullable();
    table.string('item_name', 200).notNullable();
    table.integer('quantity').notNullable().defaultTo(1);
    table.string('condition', 50).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_venue_equipment_venue_cat ON venue_equipment (venue_id, category)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_equipment');
}
