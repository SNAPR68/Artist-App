import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('coordination_checklists', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    table.unique(['booking_id']);

    // T-14: Rider confirmation
    table.boolean('rider_confirmed').notNullable().defaultTo(false);
    table.timestamp('rider_confirmed_at').nullable();

    // T-7: Logistics confirmation
    table.boolean('logistics_confirmed').notNullable().defaultTo(false);
    table.timestamp('logistics_confirmed_at').nullable();

    // T-3: Final confirmation
    table.boolean('final_confirmed').notNullable().defaultTo(false);
    table.timestamp('final_confirmed_at').nullable();

    // T-1: Briefing sent
    table.boolean('briefing_sent').notNullable().defaultTo(false);
    table.timestamp('briefing_sent_at').nullable();

    // Logistics details
    table.string('travel_mode', 50).nullable();
    table.boolean('hotel_booked').notNullable().defaultTo(false);
    table.jsonb('hotel_details').nullable();
    table.boolean('parking_arranged').notNullable().defaultTo(false);
    table.text('special_rider_notes').nullable();

    // Escalation tracking
    table.integer('escalation_level').notNullable().defaultTo(0);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('coordination_checklists');
}
