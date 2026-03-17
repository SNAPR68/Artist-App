import type { Knex } from 'knex';

const GENRES = ['Bollywood', 'Classical', 'Rock', 'Jazz', 'Electronic', 'Folk', 'Pop', 'Hip-Hop', 'Fusion', 'Sufi'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa'];
const EVENT_TYPES = ['wedding', 'corporate', 'private_party', 'concert', 'club_gig', 'festival', 'college_event', 'restaurant'];
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];
const STAGE_NAME_PREFIXES = ['DJ', 'MC', 'The', 'Band', 'Live', 'Acoustic', 'Raga', 'Beats by', 'Melody', 'Groove'];
const STAGE_NAME_SUFFIXES = ['Vibes', 'Project', 'Collective', 'Sound', 'Nation', 'Studio', 'Ensemble', 'Express', 'Factory', 'Tribe'];
const FIRST_NAMES = ['Aarav', 'Vivaan', 'Ananya', 'Diya', 'Kabir', 'Zara', 'Arjun', 'Priya', 'Rohan', 'Meera', 'Ishaan', 'Aditi', 'Vihaan', 'Saanvi', 'Reyansh', 'Aisha', 'Rudra', 'Myra', 'Krishna', 'Kiara'];
const VENUES = ['Taj Ballroom', 'ITC Grand Chola', 'The Leela Palace', 'JW Marriott', 'Hyatt Regency', 'The LaLiT', 'Oberoi', 'Four Seasons', 'Radisson Blu', 'Grand Hyatt'];
const BANK_NAMES = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'Punjab National Bank', 'Bank of Baroda'];
const IFSC_CODES = ['HDFC0001234', 'ICIC0002345', 'SBIN0003456', 'UTIB0004567', 'KKBK0005678', 'YESB0006789', 'PUNB0007890', 'BARB0008901'];

const REVIEW_COMMENTS = [
  'Absolutely amazing performance! The crowd loved every minute.',
  'Professional from start to finish. Would definitely book again.',
  'Great energy and audience engagement. Perfect for our corporate event.',
  'Exceeded expectations. The sound quality was top-notch.',
  'Good performance but arrived a bit late. Music was great though.',
  'Fantastic wedding sangeet performance. Our guests are still talking about it!',
  'Very accommodating with song requests. Great stage presence.',
  'The band was incredible. Worth every rupee.',
  'Decent performance. Could improve on crowd interaction.',
  'Outstanding! Made our college fest the best one yet.',
  'Very talented artist. The acoustic set was beautiful.',
  'Professional setup and breakdown. Great communication throughout.',
  'The DJ read the room perfectly. Dance floor was packed all night.',
  'Wonderful classical performance. Brought tears to many eyes.',
  'High energy performance that got everyone on their feet!',
];

function randomFrom<T>(arr: T[], count = 1): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDaysAgo: number, endDaysAgo: number): Date {
  const now = Date.now();
  const start = now - startDaysAgo * 86400000;
  const end = now - endDaysAgo * 86400000;
  return new Date(start + Math.random() * (end - start));
}

function futureDate(daysAhead: number, rangeDays: number): Date {
  const now = Date.now();
  return new Date(now + (daysAhead + Math.random() * rangeDays) * 86400000);
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function seed(knex: Knex): Promise<void> {
  // Clean up in reverse dependency order
  await knex('payout_transfers').del().catch(() => {});
  await knex('payment_settlements').del().catch(() => {});
  await knex('dispute_evidence').del().catch(() => {});
  await knex('disputes').del().catch(() => {});
  await knex('cancellation_details').del().catch(() => {});
  await knex('artist_bank_accounts').del().catch(() => {});
  await knex('booking_events').del();
  await knex('booking_quotes').del();
  await knex('payments').del();
  await knex('reviews').del();
  await knex('shortlist_artists').del();
  await knex('shortlists').del();
  await knex('bookings').del();
  await knex('availability_calendar').del();
  await knex('media_items').del();
  await knex('artist_agent_links').del();
  await knex('agent_profiles').del();
  await knex('client_profiles').del();
  await knex('artist_profiles').del();
  await knex('users').del();

  // ─── Create 100 Artist Users + Profiles ────────────────────
  const artistUsers: { userId: string; artistId: string }[] = [];
  for (let i = 0; i < 100; i++) {
    const phone = `9${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone,
      phone_hash: `hash_${phone}`,
      role: 'artist',
      is_active: true,
    }).returning(['id']);

    const city = randomFrom(CITIES)[0];
    const genres = randomFrom(GENRES, randomInt(1, 3));
    const eventTypes = randomFrom(EVENT_TYPES, randomInt(2, 5));

    const pricing = eventTypes.map((et) => ({
      event_type: et,
      city_tier: 'tier_1',
      min_price: randomInt(2000, 10000) * 100,
      max_price: randomInt(10000, 50000) * 100,
      travel_surcharge: randomInt(0, 5000) * 100,
    }));

    const prefix = randomFrom(STAGE_NAME_PREFIXES)[0];
    const suffix = randomFrom(STAGE_NAME_SUFFIXES)[0];
    const stageName = i < 50
      ? `${prefix} ${FIRST_NAMES[i % FIRST_NAMES.length]}`
      : `${FIRST_NAMES[i % FIRST_NAMES.length]} ${suffix}`;

    const totalBookings = randomInt(0, 80);
    const [artist] = await knex('artist_profiles').insert({
      user_id: user.id,
      stage_name: stageName,
      bio: `Professional performer based in ${city} specializing in ${genres.join(', ')}. ${randomInt(2, 15)} years of experience across ${eventTypes.length} event types.`,
      genres,
      languages: randomFrom(LANGUAGES, randomInt(1, 3)),
      base_city: city,
      travel_radius_km: randomInt(50, 500),
      event_types: eventTypes,
      performance_duration_min: 60,
      performance_duration_max: randomInt(120, 240),
      pricing: JSON.stringify(pricing),
      trust_score: (randomInt(25, 50) / 10).toFixed(1),
      total_bookings: totalBookings,
      acceptance_rate: (randomInt(60, 100) / 100).toFixed(2),
      avg_response_time_hours: (randomInt(1, 48) / 10).toFixed(1),
      is_verified: Math.random() > 0.2,
      profile_completion_pct: randomInt(65, 100),
    }).returning(['id']);

    artistUsers.push({ userId: user.id, artistId: artist.id });
  }

  // ─── Create 30 Client Users + Profiles ─────────────────────
  const clientUsers: { userId: string }[] = [];
  const clientTypes = ['corporate', 'wedding_planner', 'club_venue', 'individual', 'event_company'];
  for (let i = 0; i < 30; i++) {
    const phone = `8${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone,
      phone_hash: `hash_${phone}`,
      role: 'client',
      is_active: true,
    }).returning(['id']);
    clientUsers.push({ userId: user.id });

    await knex('client_profiles').insert({
      user_id: user.id,
      client_type: randomFrom(clientTypes)[0],
      company_name: i < 15 ? `${FIRST_NAMES[i % FIRST_NAMES.length]} Events Pvt Ltd` : null,
    });
  }

  // ─── Create 5 Agent Users + Profiles ───────────────────────
  const agentUsers: { userId: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const phone = `7${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone,
      phone_hash: `hash_${phone}`,
      role: 'agent',
      is_active: true,
    }).returning(['id']);
    agentUsers.push({ userId: user.id });

    await knex('agent_profiles').insert({
      user_id: user.id,
      company_name: `${randomFrom(STAGE_NAME_PREFIXES)[0]} Talent Agency`,
      commission_rate: randomInt(5, 15),
      total_artists: randomInt(5, 20),
    });
  }

  // ─── Create 2 Admin Users ─────────────────────────────────
  const [adminUser] = await knex('users').insert({
    phone: '9999999999',
    phone_hash: 'hash_9999999999',
    role: 'admin',
    is_active: true,
  }).returning(['id']);

  await knex('users').insert({
    phone: '9999999998',
    phone_hash: 'hash_9999999998',
    role: 'admin',
    is_active: true,
  });

  // ─── Bank Accounts for top 40 artists ─────────────────────
  for (let i = 0; i < 40; i++) {
    const artist = artistUsers[i];
    const bankIdx = i % BANK_NAMES.length;
    await knex('artist_bank_accounts').insert({
      artist_id: artist.artistId,
      account_holder_name: FIRST_NAMES[i % FIRST_NAMES.length],
      account_number_encrypted: `enc_${randomInt(10000000, 99999999)}${randomInt(1000, 9999)}`,
      ifsc_code: IFSC_CODES[bankIdx],
      bank_name: BANK_NAMES[bankIdx],
      upi_id_encrypted: i % 3 === 0 ? `enc_upi_${FIRST_NAMES[i % FIRST_NAMES.length].toLowerCase()}@${BANK_NAMES[bankIdx].split(' ')[0].toLowerCase()}` : null,
      is_verified: i < 25,
      is_primary: true,
    });
  }

  // ─── Create 80 Bookings across all states ──────────────────
  interface BookingRecord {
    id: string;
    state: string;
    client_user_id: string;
    artist_idx: number;
    event_date: string;
    final_amount_paise: number;
  }
  const allBookings: BookingRecord[] = [];

  // Distribution: realistic state spread
  const stateDistribution: { state: string; count: number }[] = [
    { state: 'inquiry', count: 8 },
    { state: 'shortlisted', count: 5 },
    { state: 'quoted', count: 6 },
    { state: 'negotiating', count: 4 },
    { state: 'confirmed', count: 8 },
    { state: 'pre_event', count: 7 },
    { state: 'event_day', count: 3 },
    { state: 'completed', count: 12 },
    { state: 'settled', count: 15 },
    { state: 'cancelled', count: 8 },
    { state: 'expired', count: 2 },
    { state: 'disputed', count: 2 },
  ];

  let bookingIdx = 0;
  for (const { state, count } of stateDistribution) {
    for (let i = 0; i < count; i++) {
      const clientUser = clientUsers[bookingIdx % clientUsers.length];
      const artistIdx = bookingIdx % artistUsers.length;
      const artist = artistUsers[artistIdx];
      const city = randomFrom(CITIES)[0];
      const eventType = randomFrom(EVENT_TYPES)[0];
      const durationHours = randomInt(2, 6);

      const baseAmount = randomInt(20000, 200000) * 100; // 2L to 20L paise
      const platformFee = Math.round(baseAmount * 0.10);
      const gst = Math.round(platformFee * 0.18);
      const tds = Math.round(baseAmount * 0.10);
      const totalClientPays = baseAmount + platformFee + gst;
      const artistPayout = baseAmount - tds;

      // Event dates based on state
      let eventDate: string;
      let createdAt: Date;
      if (['completed', 'settled', 'cancelled'].includes(state)) {
        eventDate = dateStr(randomDate(90, 10));
        createdAt = randomDate(120, 30);
      } else if (state === 'event_day') {
        eventDate = dateStr(new Date());
        createdAt = randomDate(30, 7);
      } else if (['confirmed', 'pre_event'].includes(state)) {
        eventDate = dateStr(futureDate(5, 60));
        createdAt = randomDate(30, 3);
      } else {
        eventDate = dateStr(futureDate(14, 75));
        createdAt = randomDate(14, 1);
      }

      const isConcierge = bookingIdx % 12 === 0;
      const bookingData: Record<string, unknown> = {
        client_id: clientUser.userId,
        artist_id: artist.artistId,
        event_type: eventType,
        event_date: eventDate,
        event_city: city,
        event_venue: randomFrom(VENUES)[0],
        duration_hours: durationHours,
        guest_count: randomInt(50, 500),
        special_requirements: i % 3 === 0 ? 'Sound system required. Green room needed.' : null,
        state,
        created_at: createdAt,
        updated_at: new Date(),
      };

      // Add financial data for states past quoting
      if (['confirmed', 'pre_event', 'event_day', 'completed', 'settled', 'cancelled', 'disputed'].includes(state)) {
        bookingData.quoted_amount_paise = baseAmount;
        bookingData.final_amount_paise = totalClientPays;
        bookingData.platform_fee_paise = platformFee;
        bookingData.artist_payout_paise = artistPayout;
        bookingData.tds_amount_paise = tds;
        bookingData.gst_amount_paise = gst;
        bookingData.agreed_amount = baseAmount;
        bookingData.platform_fee = platformFee;
      }
      if (['confirmed', 'pre_event', 'event_day', 'completed', 'settled'].includes(state)) {
        bookingData.confirmed_at = new Date(createdAt.getTime() + randomInt(1, 5) * 86400000);
      }
      if (['completed', 'settled'].includes(state)) {
        bookingData.completed_at = new Date(new Date(eventDate).getTime() + 86400000);
      }
      if (state === 'cancelled') {
        bookingData.cancelled_at = new Date(createdAt.getTime() + randomInt(1, 10) * 86400000);
        bookingData.cancellation_reason = 'Schedule conflict';
      }
      if (isConcierge) {
        bookingData.is_concierge_assisted = true;
        bookingData.concierge_user_id = adminUser.id;
      }

      const [booking] = await knex('bookings').insert(bookingData).returning(['id']);

      allBookings.push({
        id: booking.id,
        state,
        client_user_id: clientUser.userId,
        artist_idx: artistIdx,
        event_date: eventDate,
        final_amount_paise: totalClientPays,
      });

      // ─── Booking Events (state transition history) ──────
      const stateOrder = ['inquiry', 'shortlisted', 'quoted', 'negotiating', 'confirmed', 'pre_event', 'event_day', 'completed', 'settled'];
      const stateIndex = stateOrder.indexOf(state);
      if (stateIndex >= 0) {
        // Add transitions up to current state
        let prevState: string | null = null;
        for (let s = 0; s <= stateIndex; s++) {
          await knex('booking_events').insert({
            booking_id: booking.id,
            event_type: 'state_transition',
            from_state: prevState,
            to_state: stateOrder[s],
            triggered_by: s < 2 ? clientUser.userId : (s === 2 ? artist.userId : 'system'),
            metadata: JSON.stringify({}),
            created_at: new Date(createdAt.getTime() + s * 3600000),
          });
          prevState = stateOrder[s];
        }
      } else if (state === 'cancelled') {
        // Cancelled from some earlier state
        const cancelFrom = randomFrom(['inquiry', 'quoted', 'confirmed'])[0];
        await knex('booking_events').insert({
          booking_id: booking.id,
          event_type: 'state_transition',
          from_state: null,
          to_state: 'inquiry',
          triggered_by: clientUser.userId,
          metadata: JSON.stringify({}),
          created_at: createdAt,
        });
        await knex('booking_events').insert({
          booking_id: booking.id,
          event_type: 'state_transition',
          from_state: cancelFrom,
          to_state: 'cancelled',
          triggered_by: clientUser.userId,
          metadata: JSON.stringify({ reason: 'Schedule conflict' }),
          created_at: new Date(createdAt.getTime() + 86400000),
        });
      } else if (state === 'disputed') {
        await knex('booking_events').insert({
          booking_id: booking.id,
          event_type: 'state_transition',
          from_state: null,
          to_state: 'inquiry',
          triggered_by: clientUser.userId,
          metadata: JSON.stringify({}),
          created_at: createdAt,
        });
        await knex('booking_events').insert({
          booking_id: booking.id,
          event_type: 'state_transition',
          from_state: 'completed',
          to_state: 'disputed',
          triggered_by: clientUser.userId,
          metadata: JSON.stringify({ reason: 'Quality complaint' }),
          created_at: new Date(createdAt.getTime() + 86400000 * 5),
        });
      }

      // ─── Booking Quotes for states past quoting ─────────
      if (['quoted', 'negotiating', 'confirmed', 'pre_event', 'event_day', 'completed', 'settled'].includes(state)) {
        await knex('booking_quotes').insert({
          booking_id: booking.id,
          quoted_by: artist.userId,
          round_number: 1,
          base_amount: baseAmount,
          travel_surcharge: randomInt(0, 5000) * 100,
          platform_fee: platformFee,
          total_amount: totalClientPays,
          breakdown: JSON.stringify({
            base: baseAmount,
            platform_fee: platformFee,
            gst: gst,
            tds: tds,
          }),
          is_final: state !== 'negotiating',
          notes: 'Standard pricing for this event type',
          created_at: new Date(createdAt.getTime() + 7200000),
        });

        if (state === 'negotiating') {
          // Add counter-offer
          await knex('booking_quotes').insert({
            booking_id: booking.id,
            quoted_by: clientUser.userId,
            round_number: 2,
            base_amount: Math.round(baseAmount * 0.85),
            travel_surcharge: 0,
            platform_fee: Math.round(baseAmount * 0.85 * 0.10),
            total_amount: Math.round(baseAmount * 0.85 * 1.10 * 1.18),
            breakdown: JSON.stringify({ note: 'counter offer' }),
            is_final: false,
            notes: 'Can we work within this budget?',
            created_at: new Date(createdAt.getTime() + 14400000),
          });
        }
      }

      bookingIdx++;
    }
  }

  // ─── Payments for confirmed+ bookings ──────────────────────
  const paidStates = ['confirmed', 'pre_event', 'event_day', 'completed', 'settled', 'disputed'];
  const paidBookings = allBookings.filter(b => paidStates.includes(b.state));

  interface PaymentRecord {
    id: string;
    bookingId: string;
    state: string;
    artistIdx: number;
    amountPaise: number;
    razorpayPaymentId: string;
  }
  const allPayments: PaymentRecord[] = [];

  for (let i = 0; i < paidBookings.length; i++) {
    const b = paidBookings[i];
    const platformFee = Math.round(b.final_amount_paise * 0.10 / 1.28);
    const gst = Math.round(platformFee * 0.18);
    const tds = Math.round((b.final_amount_paise - platformFee - gst) * 0.10);
    const artistShare = b.final_amount_paise - platformFee - gst - tds;

    let paymentStatus: string;
    if (b.state === 'confirmed') paymentStatus = 'captured';
    else if (['pre_event', 'event_day'].includes(b.state)) paymentStatus = 'in_escrow';
    else if (b.state === 'settled') paymentStatus = 'settled';
    else if (b.state === 'disputed') paymentStatus = 'in_escrow';
    else paymentStatus = 'captured'; // completed

    const rzpOrderId = `order_${randomInt(100000, 999999)}${i}`;
    const rzpPaymentId = `pay_${randomInt(100000, 999999)}${i}`;

    const [payment] = await knex('payments').insert({
      booking_id: b.id,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      idempotency_key: `pay:${b.id}`,
      amount: b.final_amount_paise,
      currency: 'INR',
      status: paymentStatus,
      payment_method: randomFrom(['upi', 'card', 'netbanking'])[0],
      artist_share: artistShare,
      platform_fee: platformFee,
      agent_commission: 0,
      tds_amount: tds,
      gst_amount: gst,
      settled_at: paymentStatus === 'settled' ? new Date() : null,
      created_at: randomDate(60, 5),
    }).returning(['id']);

    allPayments.push({
      id: payment.id,
      bookingId: b.id,
      state: b.state,
      artistIdx: b.artist_idx,
      amountPaise: b.final_amount_paise,
      razorpayPaymentId: rzpPaymentId,
    });
  }

  // ─── Settlements + Payouts for settled bookings ────────────
  const settledPayments = allPayments.filter(p => p.state === 'settled');
  for (const p of settledPayments) {
    const artist = artistUsers[p.artistIdx];
    const artistPayout = Math.round(p.amountPaise * 0.78);
    const platformFee = Math.round(p.amountPaise * 0.10);
    const tds = Math.round(p.amountPaise * 0.08);

    const [settlement] = await knex('payment_settlements').insert({
      payment_id: p.id,
      artist_payout_paise: artistPayout,
      platform_fee_paise: platformFee,
      tds_paise: tds,
      settled_at: randomDate(15, 1),
    }).returning(['id']);

    // Create payout transfer if artist has bank account (first 40)
    if (p.artistIdx < 40) {
      const payoutStatus = randomFrom(['completed', 'completed', 'completed', 'pending'])[0];
      await knex('payout_transfers').insert({
        settlement_id: settlement.id,
        artist_id: artist.artistId,
        amount_paise: artistPayout,
        transfer_method: randomFrom(['bank_transfer', 'upi', 'manual'])[0],
        transfer_reference: payoutStatus === 'completed' ? `UTR${randomInt(100000000, 999999999)}` : null,
        status: payoutStatus,
        initiated_at: payoutStatus !== 'pending' ? randomDate(10, 1) : null,
        completed_at: payoutStatus === 'completed' ? randomDate(5, 0) : null,
      });
    }
  }

  // ─── Reviews for completed + settled bookings ──────────────
  const reviewableBookings = allBookings.filter(b => ['completed', 'settled'].includes(b.state));
  let reviewCount = 0;
  for (const b of reviewableBookings) {
    if (Math.random() > 0.25) continue; // ~75% of eligible bookings get reviews
    const artist = artistUsers[b.artist_idx];
    const rating = randomInt(3, 5);
    const publishDate = randomDate(30, 1);

    // Client reviews artist
    await knex('reviews').insert({
      booking_id: b.id,
      reviewer_id: b.client_user_id,
      reviewee_id: artist.userId,
      overall_rating: rating,
      dimensions: JSON.stringify({
        performance_quality: randomInt(3, 5),
        professionalism: randomInt(3, 5),
        punctuality: randomInt(2, 5),
        communication: randomInt(3, 5),
        value_for_money: randomInt(2, 5),
      }),
      comment: REVIEW_COMMENTS[reviewCount % REVIEW_COMMENTS.length],
      is_published: true,
      publish_at: publishDate,
      created_at: publishDate,
    });
    reviewCount++;

    // 50% chance artist reviews client back
    if (Math.random() > 0.5) {
      await knex('reviews').insert({
        booking_id: b.id,
        reviewer_id: artist.userId,
        reviewee_id: b.client_user_id,
        overall_rating: randomInt(3, 5),
        dimensions: JSON.stringify({
          communication: randomInt(3, 5),
          venue_quality: randomInt(3, 5),
          payment_timeliness: randomInt(3, 5),
          hospitality: randomInt(3, 5),
        }),
        comment: 'Great host! Event was well organized.',
        is_published: true,
        publish_at: publishDate,
        created_at: publishDate,
      });
      reviewCount++;
    }
  }

  // ─── Calendar entries for next 90 days ─────────────────────
  const confirmedBookings = allBookings.filter(b =>
    ['confirmed', 'pre_event', 'event_day'].includes(b.state)
  );
  for (const b of confirmedBookings) {
    const artist = artistUsers[b.artist_idx];
    await knex('availability_calendar').insert({
      artist_id: artist.artistId,
      date: b.event_date,
      status: 'booked',
      booking_id: b.id,
    }).onConflict().ignore();
  }

  // Add some blocked dates for top 20 artists
  for (let i = 0; i < 20; i++) {
    const artist = artistUsers[i];
    const blockedCount = randomInt(3, 8);
    for (let j = 0; j < blockedCount; j++) {
      const blockedDate = dateStr(futureDate(randomInt(1, 85), 1));
      await knex('availability_calendar').insert({
        artist_id: artist.artistId,
        date: blockedDate,
        status: 'blocked',
      }).onConflict().ignore();
    }
  }

  // ─── Cancellation details for cancelled bookings ───────────
  const cancelledBookings = allBookings.filter(b => b.state === 'cancelled');
  const cancellationSubTypes = ['by_client', 'by_artist', 'by_client', 'by_client', 'force_majeure'];
  for (let i = 0; i < cancelledBookings.length; i++) {
    const b = cancelledBookings[i];
    const subType = cancellationSubTypes[i % cancellationSubTypes.length];
    await knex('cancellation_details').insert({
      booking_id: b.id,
      sub_type: subType,
      initiated_by: b.client_user_id,
      reason: subType === 'by_client' ? 'Change of plans, event rescheduled'
        : subType === 'by_artist' ? 'Health emergency, unable to perform'
        : 'Venue unavailable due to weather conditions',
      refund_amount_paise: Math.round(b.final_amount_paise * (subType === 'by_artist' ? 1.0 : 0.5)),
      artist_amount_paise: subType === 'by_artist' ? 0 : Math.round(b.final_amount_paise * 0.3),
      trust_impact: subType === 'by_artist' ? JSON.stringify({ artist_penalty: -5 }) : null,
    });
  }

  // ─── Disputes for disputed bookings ────────────────────────
  const disputedBookings = allBookings.filter(b => b.state === 'disputed');
  const disputeTypes = ['quality_complaint', 'no_show', 'partial_performance'];
  for (let i = 0; i < disputedBookings.length; i++) {
    const b = disputedBookings[i];
    await knex('disputes').insert({
      booking_id: b.id,
      dispute_type: disputeTypes[i % disputeTypes.length],
      status: 'submitted',
      initiated_by: b.client_user_id,
      description: `Issue with booking performance. ${disputeTypes[i % disputeTypes.length] === 'no_show' ? 'Artist did not show up for the event.' : 'Performance quality was below expectations discussed during booking.'}`,
      evidence_deadline: new Date(Date.now() + 48 * 3600000),
    });
  }

  console.log(`Seed data inserted:
  - ${artistUsers.length} artists (${40} with bank accounts)
  - ${clientUsers.length} clients
  - ${agentUsers.length} agents
  - 2 admins
  - ${allBookings.length} bookings across ${stateDistribution.length} states
  - ${allPayments.length} payments
  - ${settledPayments.length} settlements with payouts
  - ${reviewCount} reviews
  - ${cancelledBookings.length} cancellation records
  - ${disputedBookings.length} disputes
  - Calendar entries for ${confirmedBookings.length} confirmed bookings + blocked dates`);
}
