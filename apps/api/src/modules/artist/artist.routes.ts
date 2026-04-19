import type { FastifyInstance } from 'fastify';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { artistService } from './artist.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createArtistProfileSchema,
  updateArtistProfileSchema,
  addBankAccountSchema,
  updateBankAccountSchema,
  PAGINATION,
} from '@artist-booking/shared';
import { bankAccountService } from './bank-account.service.js';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';

function fyDates(fyStart: number) {
  return {
    start: `${fyStart}-04-01`,
    end: `${fyStart + 1}-03-31`,
  };
}

function encryptPan(pan: string): string {
  const key = Buffer.from(config.PII_ENCRYPTION_KEY.slice(0, 32), 'utf8');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(pan, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decryptPan(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const key = Buffer.from(config.PII_ENCRYPTION_KEY.slice(0, 32), 'utf8');
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

function hashPan(pan: string): string {
  return createHash('sha256').update(pan).digest('hex');
}
export async function artistRoutes(app: FastifyInstance) {
  /**
   * POST /v1/artists/profile — Create artist profile
   */
  app.post('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:create'),
      rateLimit('WRITE'),
      validateBody(createArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.createProfile(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/profile — Get own profile (authenticated artist)
   */
  app.get('/v1/artists/profile', {
    preHandler: [authMiddleware, requirePermission('artist:read_own')],
  }, async (request, reply) => {
    const profile = await artistService.getOwnProfile(request.user!.user_id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * PUT /v1/artists/profile — Update own profile
   */
  app.put('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(updateArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.updateProfile(request.user!.user_id, request.body as never);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/:id — Public artist profile
   */
  app.get('/v1/artists/:id', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await artistService.getPublicProfile(id);

    return reply
      .header('Cache-Control', 'public, max-age=300, s-maxage=300')
      .send({
        success: true,
        data: profile,
        errors: [],
      });
  });

  /**
   * GET /v1/artists — List artists (paginated)
   */
  app.get('/v1/artists', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await artistService.listArtists({
      page,
      per_page,
      city: query.city,
      genre: query.genre,
    });

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page,
        total: result.total,
        total_pages: Math.ceil(result.total / per_page),
      },
      errors: [],
    });
  });

  // ─── Bank Account Routes ────────────────────────────────────

  /**
   * POST /v1/artists/bank-account — Add bank account
   */
  app.post('/v1/artists/bank-account', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(addBankAccountSchema),
    ],
  }, async (request, reply) => {
    const account = await bankAccountService.addBankAccount(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: account,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/bank-account — List bank accounts
   */
  app.get('/v1/artists/bank-account', {
    preHandler: [authMiddleware, requirePermission('artist:read_own')],
  }, async (request, reply) => {
    const accounts = await bankAccountService.getBankAccounts(request.user!.user_id);

    return reply.send({
      success: true,
      data: accounts,
      errors: [],
    });
  });

  /**
   * PUT /v1/artists/bank-account/:id — Update bank account
   */
  app.put('/v1/artists/bank-account/:id', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(updateBankAccountSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const account = await bankAccountService.updateBankAccount(request.user!.user_id, id, request.body as never);

    return reply.send({
      success: true,
      data: account,
      errors: [],
    });
  });

  /**
   * DELETE /v1/artists/bank-account/:id — Delete bank account
   */
  app.delete('/v1/artists/bank-account/:id', {
    preHandler: [authMiddleware, requirePermission('artist:update_own')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await bankAccountService.deleteBankAccount(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/oath/signers — Public list of artists who signed the Commission-Free Oath.
   */
  app.get('/v1/artists/oath/signers', async (_request, reply) => {
    const rows = await db('artist_oath_signers as aos')
      .join('artist_profiles as ap', 'ap.id', 'aos.artist_id')
      .select('aos.id', 'ap.stage_name', 'aos.signed_at')
      .orderBy('aos.signed_at', 'desc')
      .limit(500);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * POST /v1/artists/oath/sign — Artist signs the Commission-Free Oath.
   * Idempotent — signing twice is a no-op.
   */
  app.post('/v1/artists/oath/sign', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      return reply.status(400).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Only artists can sign the oath' }] });
    }

    const existing = await db('artist_oath_signers').where({ artist_id: profile.id }).first();
    if (existing) return reply.send({ success: true, data: existing, errors: [] });

    const [created] = await db('artist_oath_signers').insert({
      artist_id: profile.id,
      user_id: userId,
      ip_address: (request.headers['x-forwarded-for'] as string)?.split(',')[0] ?? request.ip ?? null,
      user_agent: (request.headers['user-agent'] as string) ?? null,
    }).returning('*');

    return reply.send({ success: true, data: created, errors: [] });
  });

  /**
   * PUT /v1/artists/me/pan — Store encrypted PAN for TDS certificates.
   */
  app.put('/v1/artists/me/pan', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const { pan } = request.body as { pan: string };
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_PAN', message: 'Invalid PAN format' }] });
    }
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });

    await db('artist_profiles').where({ id: profile.id }).update({
      pan_encrypted: encryptPan(pan),
      pan_hash: hashPan(pan),
    });
    return reply.send({ success: true, data: { pan_saved: true }, errors: [] });
  });

  /**
   * GET /v1/artists/me/tds/summary?fy=2025 — TDS summary per financial year.
   * Returns totals + per-booking line items for the TDS certificate page.
   */
  app.get('/v1/artists/me/tds/summary', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const fyStart = Number((request.query as Record<string, string>).fy) || new Date().getFullYear();
    const { start, end } = fyDates(fyStart);

    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });

    const pan = profile.pan_encrypted ? decryptPan(profile.pan_encrypted as string) : null;

    const rows = await db('payment_settlements as ps')
      .join('payments as p', 'p.id', 'ps.payment_id')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', profile.id)
      .where('ps.created_at', '>=', start)
      .where('ps.created_at', '<=', end)
      .whereNull('b.deleted_at')
      .select(
        'b.event_date',
        'b.event_type',
        'p.amount_paise as gross_paise',
        'p.tds_amount as tds_paise',
        'ps.artist_payout_paise as payout_paise',
      )
      .orderBy('b.event_date', 'asc');

    let total_gross_paise = 0;
    let total_tds_paise = 0;
    let total_payout_paise = 0;

    const line_items = rows.map((r) => {
      const gross = Number(r.gross_paise ?? 0);
      const tds = Number(r.tds_paise ?? 0);
      const payout = Number(r.payout_paise ?? 0);
      total_gross_paise += gross;
      total_tds_paise += tds;
      total_payout_paise += payout;
      return {
        event_date: r.event_date,
        event_type: r.event_type,
        gross_paise: gross,
        tds_paise: tds,
        payout_paise: payout,
      };
    });

    return reply.send({
      success: true,
      data: {
        fy_start: fyStart,
        pan: pan ? pan.slice(0, 5) + '****' + pan.slice(-1) : null,
        total_gross_paise,
        total_tds_paise,
        total_payout_paise,
        bookings_count: line_items.length,
        line_items,
      },
      errors: [],
    });
  });

  /**
   * GET /v1/artists/me/tds/certificate.pdf?fy=2025 — Download TDS certificate as PDF.
   */
  app.get('/v1/artists/me/tds/certificate.pdf', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const fyStart = Number((request.query as Record<string, string>).fy) || new Date().getFullYear();
    const { start, end } = fyDates(fyStart);
    const fyLabel = `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`;

    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });

    const pan = profile.pan_encrypted ? decryptPan(profile.pan_encrypted as string) : 'NOT PROVIDED';

    const rows = await db('payment_settlements as ps')
      .join('payments as p', 'p.id', 'ps.payment_id')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', profile.id)
      .where('ps.created_at', '>=', start)
      .where('ps.created_at', '<=', end)
      .whereNull('b.deleted_at')
      .select(
        'b.event_date',
        'b.event_type',
        'p.amount_paise as gross_paise',
        'p.tds_amount as tds_paise',
        'ps.artist_payout_paise as payout_paise',
      )
      .orderBy('b.event_date', 'asc');

    let totalGross = 0; let totalTds = 0; let totalPayout = 0;
    for (const r of rows) {
      totalGross += Number(r.gross_paise ?? 0);
      totalTds += Number(r.tds_paise ?? 0);
      totalPayout += Number(r.payout_paise ?? 0);
    }

    const fmt = (p: number) => '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a2e').text('GRID — TDS Certificate', { align: 'center' });
      doc.fontSize(11).font('Helvetica').fillColor('#555').text(`Form 16A Style · Section 194J · ${fyLabel}`, { align: 'center' });
      doc.moveDown(1.5);

      // Artist details box
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('Deductee (Artist) Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#333');
      doc.text(`Stage Name: ${profile.stage_name ?? '—'}`);
      doc.text(`PAN: ${pan}`);
      doc.text(`Financial Year: ${fyLabel} (1 Apr ${fyStart} – 31 Mar ${fyStart + 1})`);
      doc.text(`Certificate Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(1);

      // Deductor box
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('Deductor Details');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#333');
      doc.text('Name: GRID Platform (ArtistBook Technologies Pvt Ltd)');
      doc.text('TAN: PENDING (apply via NSDL)');
      doc.text('Nature of Payment: Professional / Technical Services (Sec. 194J)');
      doc.text('TDS Rate: 10%');
      doc.moveDown(1);

      // Summary
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('Summary');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#333');
      doc.text(`Total Gross Amount: ${fmt(totalGross)}`);
      doc.text(`Total TDS Deducted: ${fmt(totalTds)}`);
      doc.text(`Net Payout to Artist: ${fmt(totalPayout)}`);
      doc.text(`Number of Bookings: ${rows.length}`);
      doc.moveDown(1);

      // Line items table
      if (rows.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('Booking-wise Breakdown');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(0.5);

        // Table header
        const cols = [50, 150, 280, 360, 455];
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#555');
        doc.text('Date', cols[0], doc.y, { width: 90, continued: true });
        doc.text('Event Type', cols[1] - cols[0], 0, { width: 120, continued: true });
        doc.text('Gross', cols[2] - cols[1], 0, { width: 80, align: 'right', continued: true });
        doc.text('TDS', cols[3] - cols[2], 0, { width: 80, align: 'right', continued: true });
        doc.text('Payout', cols[4] - cols[3], 0, { width: 90, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eee').stroke();
        doc.moveDown(0.3);

        doc.font('Helvetica').fontSize(9).fillColor('#333');
        for (const r of rows) {
          const dateStr = r.event_date ? new Date(r.event_date).toLocaleDateString('en-IN') : '—';
          const y = doc.y;
          doc.text(dateStr, cols[0], y, { width: 90, continued: true });
          doc.text(String(r.event_type ?? '—'), cols[1] - cols[0], 0, { width: 120, continued: true });
          doc.text(fmt(Number(r.gross_paise ?? 0)), cols[2] - cols[1], 0, { width: 80, align: 'right', continued: true });
          doc.text(fmt(Number(r.tds_paise ?? 0)), cols[3] - cols[2], 0, { width: 80, align: 'right', continued: true });
          doc.text(fmt(Number(r.payout_paise ?? 0)), cols[4] - cols[3], 0, { width: 90, align: 'right' });
          doc.moveDown(0.4);
          if (doc.y > 720) doc.addPage();
        }
      }

      // Footer
      doc.moveDown(1.5);
      doc.fontSize(8).font('Helvetica').fillColor('#999')
        .text('This is a system-generated certificate. For official TDS filings, use Form 26AS from the TRACES portal.', { align: 'center' });

      doc.end();
    });

    const pdf = Buffer.concat(chunks);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="tds-certificate-${fyLabel.replace(' ', '-')}.pdf"`);
    reply.header('Content-Length', String(pdf.length));
    return reply.send(pdf);
  });
}
