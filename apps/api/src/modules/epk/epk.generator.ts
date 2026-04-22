/**
 * Event Company OS pivot (2026-04-22) — EPK (Electronic Press Kit) generator.
 *
 * Renders four artifacts from an artist_profile snapshot:
 *   - PDF   via pdfkit      : branded press kit (bio, stats, gallery, contact)
 *   - XLSX  via exceljs     : stats + past bookings sheet
 *   - PPTX  via pptxgenjs   : pitch deck (cover, bio, stats, gallery, CTA)
 *   - MP4   via fluent-ffmpeg: highlight reel from top N media items (optional)
 *
 * Pure render — no DB writes. Caller (epk.service) uploads to S3 and records
 * the row in `epk_artifacts`.
 */
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import axios from 'axios';
import { db } from '../../infrastructure/database.js';

// Nocturne Hollywood palette (matches web/globals.css).
const COLORS = {
  ink: '#0e0e0f',
  surface: '#1a191b',
  purple: '#c39bff',
  cyan: '#a1faff',
  gold: '#ffbf00',
  text: '#333333',
  muted: '#666666',
  border: '#dddddd',
};

export interface EpkInputs {
  vendor_profile_id: string;
  stage_name: string;
  category: string | null;
  city: string | null;
  bio: string | null;
  base_price_inr: number | null;
  rating_avg: number | null;
  review_count: number | null;
  booking_count: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  media: Array<{ id: string; media_type: 'image' | 'video'; url: string; thumbnail_url?: string | null }>;
  instagram: { ig_username: string | null; follower_count: number | null; media_count: number | null };
  recent_bookings: Array<{ event_date: string; venue: string | null; city: string | null }>;
}

export interface EpkBundle {
  pdf: Buffer;
  xlsx: Buffer;
  pptx: Buffer;
  mp4: Buffer | null;
  media_item_count: number;
}

function inr(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

// ─── Data loading ───────────────────────────────────────────────────────────

export async function loadEpkInputs(vendorProfileId: string): Promise<EpkInputs> {
  const profile = await db('artist_profiles as ap')
    .leftJoin('users as u', 'u.id', 'ap.user_id')
    .where('ap.id', vendorProfileId)
    .first(
      'ap.id',
      'ap.stage_name',
      db.raw('ap.category::text as category'),
      'ap.base_city as city',
      'ap.bio',
      'ap.pricing',
      'ap.trust_score',
      'ap.total_bookings',
      'u.email as contact_email',
      'u.phone as contact_phone',
    );
  if (!profile) throw new Error('VENDOR_NOT_FOUND');

  // `pricing` is a JSONB array of tiers: [{ price_inr: number, ... }]. Use min.
  let basePriceInr: number | null = null;
  try {
    const tiers = Array.isArray(profile.pricing) ? profile.pricing : JSON.parse(profile.pricing ?? '[]');
    const prices = tiers
      .map((t: any) => Number(t?.price_inr ?? t?.base_price ?? t?.amount))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (prices.length) basePriceInr = Math.min(...prices);
  } catch {
    basePriceInr = null;
  }

  const media = await db('media_items')
    .where({ artist_id: vendorProfileId })
    .whereNull('deleted_at')
    .where('transcode_status', 'completed')
    .orderBy([{ column: 'sort_order', order: 'asc' }, { column: 'created_at', order: 'desc' }])
    .limit(12)
    .select(
      'id',
      db.raw('type::text as media_type'),
      db.raw('COALESCE(preview_url, cdn_url, original_url) as url'),
      'thumbnail_url',
    );

  const ig = await db('instagram_connections')
    .where({ vendor_profile_id: vendorProfileId, is_active: true })
    .first('ig_username', 'follower_count', 'media_count');

  const recent = await db('bookings')
    .where({ artist_id: vendorProfileId, state: 'completed' })
    .whereNull('deleted_at')
    .orderBy('event_date', 'desc')
    .limit(8)
    .select('event_date', 'event_venue as venue', 'event_city as city')
    .catch(() => []);

  return {
    vendor_profile_id: profile.id,
    stage_name: profile.stage_name,
    category: profile.category ?? null,
    city: profile.city ?? null,
    bio: profile.bio ?? null,
    base_price_inr: basePriceInr,
    // trust_score is 0-100 (decimal); surface as a 0-5 star equivalent for the EPK stat card.
    rating_avg: profile.trust_score === null || profile.trust_score === undefined
      ? null
      : Math.min(5, Number(profile.trust_score) / 20),
    review_count: null,
    booking_count: profile.total_bookings ?? null,
    contact_email: profile.contact_email ?? null,
    contact_phone: profile.contact_phone ?? null,
    media: media ?? [],
    instagram: {
      ig_username: ig?.ig_username ?? null,
      follower_count: ig?.follower_count ?? null,
      media_count: ig?.media_count ?? null,
    },
    recent_bookings: (recent ?? []).map((r: any) => ({
      event_date: r.event_date,
      venue: r.venue,
      city: r.city,
    })),
  };
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export async function renderPdf(inputs: EpkInputs): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cover band
    doc.rect(0, 0, doc.page.width, 180).fill(COLORS.ink);
    doc.fillColor('#ffffff').fontSize(34).text(inputs.stage_name, 48, 60, { width: doc.page.width - 96 });
    doc.fillColor(COLORS.cyan).fontSize(12).text(
      [inputs.category, inputs.city].filter(Boolean).join(' · ').toUpperCase() || 'ARTIST',
      48,
      110,
    );
    doc.fillColor(COLORS.purple).fontSize(10).text('ELECTRONIC PRESS KIT', 48, 140);

    doc.y = 210;
    doc.fillColor(COLORS.text);

    // Bio
    if (inputs.bio) {
      doc.fontSize(14).fillColor(COLORS.ink).text('About');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor(COLORS.text).text(inputs.bio, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Stats row
    const stats: Array<[string, string]> = [
      ['Starting Fee', inr(inputs.base_price_inr)],
      ['Rating', inputs.rating_avg ? `${inputs.rating_avg.toFixed(1)} ★ (${inputs.review_count ?? 0})` : '—'],
      ['Bookings', String(inputs.booking_count ?? 0)],
      ['Instagram', inputs.instagram.follower_count
        ? `${new Intl.NumberFormat('en').format(inputs.instagram.follower_count)} followers`
        : '—'],
    ];
    const colW = (doc.page.width - 96) / stats.length;
    const statsY = doc.y;
    stats.forEach(([label, value], i) => {
      const x = 48 + i * colW;
      doc.rect(x, statsY, colW - 8, 64).fillOpacity(0.05).fill(COLORS.purple).fillOpacity(1);
      doc.fillColor(COLORS.muted).fontSize(9).text(label.toUpperCase(), x + 10, statsY + 10, { width: colW - 28 });
      doc.fillColor(COLORS.ink).fontSize(16).text(value, x + 10, statsY + 28, { width: colW - 28 });
    });
    doc.y = statsY + 80;

    // Gallery grid (up to 6 thumbnails)
    const gallery = inputs.media.slice(0, 6);
    if (gallery.length > 0) {
      doc.fillColor(COLORS.ink).fontSize(14).text('Gallery');
      doc.moveDown(0.3);
      const gridY = doc.y;
      const cellW = (doc.page.width - 96 - 24) / 3;
      const cellH = 90;
      gallery.forEach((m, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = 48 + col * (cellW + 12);
        const y = gridY + row * (cellH + 12);
        doc.rect(x, y, cellW, cellH).fillOpacity(0.1).fill(COLORS.purple).fillOpacity(1);
        doc.fillColor(COLORS.muted).fontSize(9)
          .text(m.media_type === 'video' ? '▶ video' : 'image', x + 8, y + cellH - 16);
      });
      doc.y = gridY + Math.ceil(gallery.length / 3) * (cellH + 12) + 8;
    }

    // Contact footer
    doc.moveDown(0.5);
    doc.fillColor(COLORS.ink).fontSize(14).text('Contact');
    doc.moveDown(0.3);
    doc.fillColor(COLORS.text).fontSize(11);
    if (inputs.contact_email) doc.text(`Email: ${inputs.contact_email}`);
    if (inputs.contact_phone) doc.text(`Phone: ${inputs.contact_phone}`);
    if (inputs.instagram.ig_username) doc.text(`Instagram: @${inputs.instagram.ig_username}`);
    doc.moveDown(0.6);
    doc.fillColor(COLORS.muted).fontSize(9).text('Generated by GRID — the Event Company OS.');

    doc.end();
  });
}

// ─── XLSX ───────────────────────────────────────────────────────────────────

export async function renderXlsx(inputs: EpkInputs): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRID';
  wb.created = new Date();

  const stats = wb.addWorksheet('Overview');
  stats.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 48 },
  ];
  stats.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  stats.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E0E0F' } };

  const rows: Array<[string, string | number | null]> = [
    ['Stage name', inputs.stage_name],
    ['Category', inputs.category],
    ['City', inputs.city],
    ['Starting fee (INR)', inputs.base_price_inr],
    ['Rating', inputs.rating_avg],
    ['Review count', inputs.review_count],
    ['Total bookings', inputs.booking_count],
    ['IG username', inputs.instagram.ig_username ? '@' + inputs.instagram.ig_username : null],
    ['IG followers', inputs.instagram.follower_count],
    ['IG posts', inputs.instagram.media_count],
    ['Email', inputs.contact_email],
    ['Phone', inputs.contact_phone],
  ];
  rows.forEach(([k, v]) => stats.addRow({ field: k, value: v ?? '—' }));

  const bookings = wb.addWorksheet('Recent Bookings');
  bookings.columns = [
    { header: 'Event date', key: 'date', width: 16 },
    { header: 'Venue', key: 'venue', width: 32 },
    { header: 'City', key: 'city', width: 20 },
  ];
  bookings.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  bookings.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E0E0F' } };
  inputs.recent_bookings.forEach((b) => {
    bookings.addRow({
      date: b.event_date ? new Date(b.event_date).toISOString().slice(0, 10) : '',
      venue: b.venue ?? '',
      city: b.city ?? '',
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── PPTX ───────────────────────────────────────────────────────────────────

export async function renderPptx(inputs: EpkInputs): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in
  pres.author = 'GRID';
  pres.company = 'GRID';
  pres.title = `${inputs.stage_name} — EPK`;

  // Cover
  const cover = pres.addSlide();
  cover.background = { color: '0E0E0F' };
  cover.addText(inputs.stage_name, {
    x: 0.6, y: 2.6, w: 12, h: 1.4, fontSize: 56, bold: true, color: 'FFFFFF', fontFace: 'Arial',
  });
  cover.addText(
    [inputs.category, inputs.city].filter(Boolean).join(' · ').toUpperCase() || 'ARTIST',
    { x: 0.6, y: 4.0, w: 12, h: 0.5, fontSize: 18, color: 'A1FAFF', fontFace: 'Arial', bold: true },
  );
  cover.addText('ELECTRONIC PRESS KIT', {
    x: 0.6, y: 4.6, w: 12, h: 0.4, fontSize: 14, color: 'C39BFF', fontFace: 'Arial', bold: true, charSpacing: 4,
  });

  // Bio
  if (inputs.bio) {
    const bio = pres.addSlide();
    bio.background = { color: 'FFFFFF' };
    bio.addText('About', { x: 0.6, y: 0.5, w: 12, h: 0.7, fontSize: 28, bold: true, color: '0E0E0F' });
    bio.addText(inputs.bio, {
      x: 0.6, y: 1.4, w: 12, h: 5.5, fontSize: 16, color: '333333', fontFace: 'Arial', paraSpaceAfter: 6,
    });
  }

  // Stats
  const stats = pres.addSlide();
  stats.background = { color: 'FFFFFF' };
  stats.addText('The Numbers', { x: 0.6, y: 0.5, w: 12, h: 0.7, fontSize: 28, bold: true, color: '0E0E0F' });
  const statRows: Array<[string, string]> = [
    ['Starting Fee', inr(inputs.base_price_inr)],
    ['Rating', inputs.rating_avg ? `${inputs.rating_avg.toFixed(1)} ★ (${inputs.review_count ?? 0})` : '—'],
    ['Total Bookings', String(inputs.booking_count ?? 0)],
    ['IG Followers', inputs.instagram.follower_count
      ? new Intl.NumberFormat('en').format(inputs.instagram.follower_count)
      : '—'],
  ];
  statRows.forEach(([label, value], i) => {
    const x = 0.6 + (i % 4) * 3.1;
    const y = 2.0;
    stats.addShape(pres.ShapeType.rect, {
      x, y, w: 2.9, h: 2.0, fill: { color: 'F3EBFF' }, line: { color: 'C39BFF', width: 1 },
    });
    stats.addText(label.toUpperCase(), {
      x: x + 0.15, y: y + 0.15, w: 2.6, h: 0.4, fontSize: 10, color: '666666', bold: true, charSpacing: 2,
    });
    stats.addText(value, {
      x: x + 0.15, y: y + 0.7, w: 2.6, h: 1.0, fontSize: 24, color: '0E0E0F', bold: true,
    });
  });

  // Gallery
  if (inputs.media.length > 0) {
    const gallery = pres.addSlide();
    gallery.background = { color: '0E0E0F' };
    gallery.addText('Gallery', { x: 0.6, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: 'FFFFFF' });
    const thumbs = inputs.media.slice(0, 6);
    thumbs.forEach((m, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.6 + col * 4.2;
      const y = 1.4 + row * 2.9;
      const url = m.thumbnail_url || m.url;
      try {
        gallery.addImage({ path: url, x, y, w: 4.0, h: 2.7, sizing: { type: 'cover', w: 4.0, h: 2.7 } });
      } catch {
        gallery.addShape(pres.ShapeType.rect, {
          x, y, w: 4.0, h: 2.7, fill: { color: '201F21' }, line: { color: 'C39BFF', width: 1 },
        });
      }
    });
  }

  // CTA
  const cta = pres.addSlide();
  cta.background = { color: '0E0E0F' };
  cta.addText('Book ' + inputs.stage_name, {
    x: 0.6, y: 2.6, w: 12, h: 1.2, fontSize: 44, bold: true, color: 'FFFFFF',
  });
  const contactLines = [
    inputs.contact_email ? `Email  ${inputs.contact_email}` : null,
    inputs.contact_phone ? `Phone  ${inputs.contact_phone}` : null,
    inputs.instagram.ig_username ? `Instagram  @${inputs.instagram.ig_username}` : null,
  ].filter(Boolean) as string[];
  cta.addText(contactLines.join('\n'), {
    x: 0.6, y: 4.0, w: 12, h: 2.0, fontSize: 18, color: 'A1FAFF', paraSpaceAfter: 8,
  });
  cta.addText('Powered by GRID — the Event Company OS', {
    x: 0.6, y: 6.9, w: 12, h: 0.4, fontSize: 10, color: 'C39BFF', italic: true,
  });

  const out = await pres.write({ outputType: 'nodebuffer' });
  return out as Buffer;
}

// ─── MP4 reel ───────────────────────────────────────────────────────────────

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('FFMPEG_NOT_FOUND'));
    const proc = spawn(ffmpegPath as unknown as string, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 15000 });
  return Buffer.from(res.data);
}

/**
 * Assembles a 1080p reel from up to 6 media items. Each image is shown for
 * 2.5s with a fade between clips. Videos are re-encoded trimmed to 3s. Returns
 * null if there are zero usable media items.
 */
export async function renderMp4(inputs: EpkInputs): Promise<Buffer | null> {
  const pool = inputs.media.slice(0, 6);
  if (pool.length === 0) return null;

  const workdir = await mkdtemp(path.join(tmpdir(), 'grid-epk-'));
  try {
    const segments: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      const m = pool[i];
      const url = m.media_type === 'image' ? (m.thumbnail_url || m.url) : m.url;
      if (!url) continue;
      let buf: Buffer;
      try {
        buf = await fetchBuffer(url);
      } catch {
        continue;
      }
      const inFile = path.join(workdir, `in-${i}${m.media_type === 'video' ? '.mp4' : '.jpg'}`);
      const outFile = path.join(workdir, `seg-${i}.mp4`);
      await writeFile(inFile, buf);

      if (m.media_type === 'image') {
        await runFfmpeg([
          '-y', '-loop', '1', '-t', '2.5', '-i', inFile,
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
          '-r', '30', outFile,
        ]);
      } else {
        await runFfmpeg([
          '-y', '-i', inFile, '-t', '3',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p',
          '-an',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
          '-r', '30', outFile,
        ]);
      }
      segments.push(outFile);
    }

    if (segments.length === 0) return null;

    const concatList = path.join(workdir, 'concat.txt');
    await writeFile(concatList, segments.map((s) => `file '${s}'`).join('\n'));
    const finalPath = path.join(workdir, 'reel.mp4');
    await runFfmpeg([
      '-y', '-f', 'concat', '-safe', '0', '-i', concatList,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      finalPath,
    ]);

    return await readFile(finalPath);
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export async function renderEpkBundle(inputs: EpkInputs, opts: { includeReel?: boolean } = {}): Promise<EpkBundle> {
  const [pdf, xlsx, pptx] = await Promise.all([
    renderPdf(inputs),
    renderXlsx(inputs),
    renderPptx(inputs),
  ]);
  let mp4: Buffer | null = null;
  if (opts.includeReel !== false) {
    try {
      mp4 = await renderMp4(inputs);
    } catch {
      mp4 = null;
    }
  }
  return { pdf, xlsx, pptx, mp4, media_item_count: inputs.media.length };
}
