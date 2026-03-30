import { NextRequest, NextResponse } from 'next/server';
import { generateDocxBuffer } from '@/integrations/docx/generator';
import { buildResumeHtml } from '@/lib/resume-html';
import type { Resume } from '@/lib/types';

// ============================================================================
// POST /api/export — Generate DOCX, HTML, or PDF from resume JSON
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, format = 'docx' } = body as {
      resume: Resume;
      format: 'docx' | 'html' | 'pdf';
    };

    if (!resume) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 });
    }

    if (format === 'docx') {
      const buffer = await generateDocxBuffer(resume);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="tailored-resume.docx"`,
        },
      });
    }

    if (format === 'html') {
      const html = buildResumeHtml(resume);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="tailored-resume.html"`,
        },
      });
    }

    if (format === 'pdf') {
      // Generate PDF from HTML using Puppeteer
      const html = buildResumeHtml(resume);
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;

      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' },
        printBackground: false,
      });

      await browser.close();

      return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="tailored-resume.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
  } catch (error) {
    console.error('[api/export] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
