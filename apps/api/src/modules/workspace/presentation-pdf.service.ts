import PDFDocument from 'pdfkit';

// ─── Types ────────────────────────────────────────────────────

interface PresentationArtist {
  id: string;
  stage_name: string;
  bio: string | null;
  genres: string[] | null;
  city: string | null;
  trust_score: number | null;
  profile_image_url: string | null;
  notes: string | null;
  pricing: Array<{
    artist_id: string;
    event_type: string;
    city_tier: string;
    base_price_paise: number;
    duration_hours: number;
  }>;
}

interface PresentationPdfData {
  presentation: {
    id: string;
    title: string;
    custom_header: string | null;
    custom_footer: string | null;
    include_pricing: boolean;
    include_media: boolean;
    created_at: string;
  };
  workspace_branding: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
  artists: PresentationArtist[];
}

// ─── Helpers ──────────────────────────────────────────────────

const COLORS = {
  text: '#333333',
  muted: '#666666',
  light: '#999999',
  border: '#dddddd',
  white: '#ffffff',
};

function formatINR(paise: number): string {
  return '\u20B9' + (paise / 100).toLocaleString('en-IN');
}

function trustStarsText(score: number): string {
  const filled = Math.round(score);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? '\u2605' : '\u2606')).join('');
  return `${stars} ${score.toFixed(1)}`;
}

function truncateBio(bio: string | null, maxLen = 200): string {
  if (!bio) return '';
  if (bio.length <= maxLen) return bio;
  return bio.slice(0, maxLen).trimEnd() + '...';
}

// ─── PDF Generator ────────────────────────────────────────────

export async function generatePresentationPdf(data: PresentationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: data.presentation.title,
        Author: data.workspace_branding?.name ?? 'Artist Booking Platform',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brandColor = data.workspace_branding?.brand_color ?? '#1A3C6D';
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ── Page 1: Cover / Header ────────────────────────────────

    // Brand color accent bar at top
    doc.rect(0, 0, pageWidth, 24).fill(brandColor);

    doc.moveDown(2);

    // Workspace name
    if (data.workspace_branding?.name) {
      doc.fontSize(12).fillColor(COLORS.muted)
        .text(data.workspace_branding.name, { align: 'center' });
      doc.moveDown(0.3);
    }

    // Presentation title
    doc.fontSize(24).fillColor(brandColor)
      .text(data.presentation.title, { align: 'center' });
    doc.moveDown(0.5);

    // Subtitle line
    doc.fontSize(10).fillColor(COLORS.light)
      .text(`${data.artists.length} Artist${data.artists.length !== 1 ? 's' : ''} | Generated ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    // Custom header text
    if (data.presentation.custom_header) {
      drawDivider(doc, margin, contentWidth);
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor(COLORS.text)
        .text(data.presentation.custom_header, margin, doc.y, {
          width: contentWidth,
          align: 'left',
          lineGap: 3,
        });
      doc.moveDown(1);
    }

    drawDivider(doc, margin, contentWidth);
    doc.moveDown(1);

    // ── Artist Sections ───────────────────────────────────────

    data.artists.forEach((artist, index) => {
      // Check if we need a new page (leave room for at least 180pt of content)
      if (doc.y > doc.page.height - 220) {
        addFooter(doc, margin, contentWidth, brandColor);
        doc.addPage();
        // Accent bar on new pages
        doc.rect(0, 0, pageWidth, 8).fill(brandColor);
        doc.y = 40;
      }

      // Artist number + stage name
      doc.fontSize(16).fillColor(brandColor)
        .text(`${index + 1}. ${artist.stage_name}`, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.3);

      // Genres
      if (artist.genres && artist.genres.length > 0) {
        doc.fontSize(10).fillColor(COLORS.muted)
          .text(artist.genres.join(', '), margin, doc.y, {
            width: contentWidth,
            oblique: true,
          });
        doc.moveDown(0.2);
      }

      // City
      if (artist.city) {
        doc.fontSize(10).fillColor(COLORS.text)
          .text(`Location: ${artist.city}`, margin, doc.y, { width: contentWidth });
        doc.moveDown(0.2);
      }

      // Trust score
      if (artist.trust_score && artist.trust_score > 0) {
        doc.fontSize(10).fillColor(COLORS.text)
          .text(`Trust Score: ${trustStarsText(artist.trust_score)}`, margin, doc.y, { width: contentWidth });
        doc.moveDown(0.2);
      }

      // Bio
      const bio = truncateBio(artist.bio);
      if (bio) {
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor(COLORS.text)
          .text(bio, margin, doc.y, {
            width: contentWidth,
            lineGap: 2,
          });
        doc.moveDown(0.2);
      }

      // Pricing
      if (data.presentation.include_pricing && artist.pricing.length > 0) {
        const prices = artist.pricing.map((p) => p.base_price_paise);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceStr = minPrice === maxPrice
          ? formatINR(minPrice)
          : `${formatINR(minPrice)} \u2014 ${formatINR(maxPrice)}`;

        doc.moveDown(0.2);
        doc.fontSize(10).fillColor(COLORS.text)
          .text(`Price Range: `, margin, doc.y, { continued: true })
          .font('Helvetica-Bold').text(priceStr).font('Helvetica');
        doc.moveDown(0.2);
      }

      // Notes
      if (artist.notes) {
        doc.moveDown(0.2);
        // Small accent bar for notes
        const noteY = doc.y;
        doc.rect(margin, noteY, 3, 30).fill(brandColor);
        doc.fontSize(9).fillColor(COLORS.muted)
          .text('Note:', margin + 10, noteY);
        doc.fontSize(9).fillColor(COLORS.text)
          .text(artist.notes, margin + 10, doc.y, {
            width: contentWidth - 10,
            oblique: true,
            lineGap: 2,
          });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.5);

      // Separator between artists (not after last)
      if (index < data.artists.length - 1) {
        drawDivider(doc, margin, contentWidth);
        doc.moveDown(0.8);
      }
    });

    // ── Custom Footer Text ────────────────────────────────────

    if (data.presentation.custom_footer) {
      if (doc.y > doc.page.height - 160) {
        addFooter(doc, margin, contentWidth, brandColor);
        doc.addPage();
        doc.rect(0, 0, pageWidth, 8).fill(brandColor);
        doc.y = 40;
      }

      doc.moveDown(1);
      drawDivider(doc, margin, contentWidth);
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor(COLORS.text)
        .text(data.presentation.custom_footer, margin, doc.y, {
          width: contentWidth,
          lineGap: 3,
        });
    }

    // ── Final Footer ──────────────────────────────────────────

    addFooter(doc, margin, contentWidth, brandColor);

    doc.end();
  });
}

// ─── PDF Drawing Helpers ──────────────────────────────────────

function drawDivider(doc: InstanceType<typeof PDFDocument>, x: number, width: number) {
  doc.moveTo(x, doc.y).lineTo(x + width, doc.y)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();
}

function addFooter(doc: InstanceType<typeof PDFDocument>, margin: number, contentWidth: number, brandColor: string) {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 35;

  // Bottom accent bar
  doc.rect(0, pageHeight - 12, doc.page.width, 12).fill(brandColor);

  // Footer text
  doc.fontSize(8).fillColor(COLORS.light)
    .text('Powered by Artist Booking Platform', margin, footerY, {
      width: contentWidth / 2,
      align: 'left',
    });

  // Page number
  const pageRange = doc.bufferedPageRange();
  const pageNum = pageRange.start + pageRange.count;
  doc.fontSize(8).fillColor(COLORS.light)
    .text(`Page ${pageNum}`, margin + contentWidth / 2, footerY, {
      width: contentWidth / 2,
      align: 'right',
    });
}
