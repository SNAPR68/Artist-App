/**
 * Local smoke-test for EPK generator (2026-04-22).
 * Picks the artist_profile with the most media items (falls back to any profile)
 * and writes PDF + XLSX + PPTX + MP4 (optional) to /tmp. Zero network fan-out:
 * does NOT upload to S3 or insert into epk_artifacts.
 *
 * Run: tsx apps/api/scripts/smoke-epk.ts [--no-reel]
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { db } from '../src/infrastructure/database.js';
import { loadEpkInputs, renderEpkBundle } from '../src/modules/epk/epk.generator.js';

async function main() {
  const includeReel = !process.argv.includes('--no-reel');

  const pick = await db('artist_profiles as ap')
    .leftJoin('media_items as m', 'm.artist_id', 'ap.id')
    .whereNull('ap.deleted_at')
    .groupBy('ap.id', 'ap.stage_name')
    .select('ap.id', 'ap.stage_name', db.raw('count(m.id)::int as media_count'))
    .orderBy('media_count', 'desc')
    .first();

  if (!pick) {
    console.error('No artist_profiles found.');
    process.exit(1);
  }

  console.log(
    `Target: ${pick.stage_name} (${pick.id}) \u2014 ${pick.media_count} media item(s); reel=${includeReel}`,
  );

  const t0 = Date.now();
  const inputs = await loadEpkInputs(pick.id);
  const bundle = await renderEpkBundle(inputs, { includeReel });
  const ms = Date.now() - t0;

  const base = `/tmp/grid-epk-${pick.id}`;
  writeFileSync(`${base}.pdf`, bundle.pdf);
  writeFileSync(`${base}.xlsx`, bundle.xlsx);
  writeFileSync(`${base}.pptx`, bundle.pptx);
  if (bundle.mp4) writeFileSync(`${base}.mp4`, bundle.mp4);

  console.log(`PDF   ${bundle.pdf.length} bytes \u2192 ${base}.pdf`);
  console.log(`XLSX  ${bundle.xlsx.length} bytes \u2192 ${base}.xlsx`);
  console.log(`PPTX  ${bundle.pptx.length} bytes \u2192 ${base}.pptx`);
  console.log(
    bundle.mp4
      ? `MP4   ${bundle.mp4.length} bytes \u2192 ${base}.mp4`
      : `MP4   (skipped \u2014 no usable media or ffmpeg unavailable)`,
  );
  console.log(`Media items: ${bundle.media_item_count}`);
  console.log(`Generated in ${ms}ms`);

  await db.destroy();
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
