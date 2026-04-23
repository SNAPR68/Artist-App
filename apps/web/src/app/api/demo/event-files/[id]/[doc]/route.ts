import { type NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ALLOWED_DOCS = new Set(['call-sheet', 'consolidated-rider', 'boq']);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; doc: string } },
) {
  const { id, doc } = params;
  if (!ALLOWED_DOCS.has(doc)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const format = request.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'pdf';
  const upstream = `${API_BASE}/v1/demo/event-files/${id}/${doc}?format=${format}`;

  let res: Response;
  try {
    res = await fetch(upstream, { cache: 'no-store' });
  } catch {
    return new NextResponse('Upstream unavailable', { status: 502 });
  }

  if (!res.ok) {
    return new NextResponse('Not found', { status: res.status });
  }

  const contentType =
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

  const slug = doc;
  const disposition =
    format === 'xlsx'
      ? `attachment; filename="${slug}-${id.slice(0, 8)}.xlsx"`
      : `inline; filename="${slug}-${id.slice(0, 8)}.pdf"`;

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  });
}
