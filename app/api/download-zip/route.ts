import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

const ALLOWED_DOMAINS = [
  'file.aiquickdraw.com',
  'nanobananaapi.ai',
  'cdn.nanobananaapi.ai',
  'tempfile.aiquickdraw.com',
];

export async function POST(req: NextRequest) {
  const { urls, prefix = 'slide' } = await req.json();

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
  }

  // Validate domains
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
        return NextResponse.json({ error: `Domain not allowed: ${parsed.hostname}` }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  try {
    const zip = new JSZip();

    // Fetch all images in parallel
    const results = await Promise.allSettled(
      urls.map(async (url: string, i: number) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        return { index: i, buffer };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { index, buffer } = result.value;
        zip.file(`${prefix}-${index + 1}.png`, buffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${prefix}-funnel.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[download-zip] Error:', err);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
