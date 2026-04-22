/**
 * Local smoke-test for call-sheet generator (2026-04-22).
 * Picks the event_file with the most vendors and writes PDF + XLSX to /tmp.
 * Zero network fan-out: does NOT call S3 upload or notification dispatch.
 *
 * Run: tsx apps/api/scripts/smoke-call-sheet.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { db } from '../src/infrastructure/database.js';
import { generateCallSheet } from '../src/modules/event-file/call-sheet.generator.js';

async function main() {
  const pick = await db('event_files as ef')
    .leftJoin('event_file_vendors as efv', 'efv.event_file_id', 'ef.id')
    .whereNull('ef.deleted_at')
    .groupBy('ef.id', 'ef.event_name')
    .select('ef.id', 'ef.event_name', db.raw('count(efv.id)::int as vendor_count'))
    .orderBy('vendor_count', 'desc')
    .first();

  if (!pick) {
    console.error('No event files found.');
    process.exit(1);
  }

  console.log(`Target: ${pick.event_name} (${pick.id}) — ${pick.vendor_count} vendor(s)`);

  const t0 = Date.now();
  const bundle = await generateCallSheet(pick.id);
  const ms = Date.now() - t0;

  const pdfPath = `/tmp/grid-call-sheet-${pick.id}.pdf`;
  const xlsxPath = `/tmp/grid-call-sheet-${pick.id}.xlsx`;
  writeFileSync(pdfPath, bundle.pdf);
  writeFileSync(xlsxPath, bundle.xlsx);

  console.log(`PDF   ${bundle.pdf.length} bytes → ${pdfPath}`);
  console.log(`XLSX  ${bundle.xlsx.length} bytes → ${xlsxPath}`);
  console.log(`Snapshot:`, bundle.snapshot);
  console.log(`Generated in ${ms}ms`);

  await db.destroy();
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
