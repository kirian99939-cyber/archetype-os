import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const width = parseInt(req.nextUrl.searchParams.get('width') || '0');
  const height = parseInt(req.nextUrl.searchParams.get('height') || '0');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const ALLOWED_DOMAINS = ['file.aiquickdraw.com', 'nanobananaapi.ai', 'cdn.nanobananaapi.ai', 'tempfile.aiquickdraw.com'];

  try {
    const parsedUrl = new URL(url);
    if (!ALLOWED_DOMAINS.some(d => parsedUrl.hostname.endsWith(d))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    let outputBuffer: Buffer;
    if (width > 0 && height > 0) {
      outputBuffer = await sharp(buffer)
        .resize(width, height, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
    } else {
      outputBuffer = buffer;
    }

    const filename = `banner-${width && height ? `${width}x${height}-` : ''}${Date.now()}.png`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[download-image] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
