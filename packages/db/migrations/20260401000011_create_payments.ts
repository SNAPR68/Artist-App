import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    table.string('razorpay_order_id', 100).nullable();
    table.string('razorpay_payment_id', 100).nullable();
    table.string('idempotency_key', 100).nullable().unique();
    table.bigInteger('amount').notNullable(); // paise
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.specificType('status', 'payment_status').notNullable().defaultTo('pending');
    table.string('payment_method', 50).nullable();
    table.bigInteger('artist_share').notNullable().defaultTo(0); // paise
    table.bigInteger('platform_fee').notNullable().defaultTo(0); // paise
    table.bigInteger('agent_commission').notNullable().defaultTo(0); // paise
    table.bigInteger('tds_amount').notNullable().defaultTo(0); // paise
    table.bigInteger('gst_amount').notNullable().defaultTo(0); // paise
    table.bigInteger('refund_amount').nullable(); // paise
    table.string('refund_id', 100).nullable();
    table.timestamp('settled_at').nullable();
    table.jsonb('razorpay_response').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index(['booking_id']);
    table.index(['razorpay_order_id']);
    table.index(['razorpay_payment_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payments');
}
