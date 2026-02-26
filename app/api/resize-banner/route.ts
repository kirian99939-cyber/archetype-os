import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { BANNER_DIMENSIONS } from '@/lib/resizeBanner';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, formatId } = await req.json();

    if (!imageUrl || !formatId) {
      return NextResponse.json({ error: 'Missing imageUrl or formatId' }, { status: 400 });
    }

    const dimensions = BANNER_DIMENSIONS[formatId];
    if (!dimensions) {
      return NextResponse.json({ error: `Unknown format: ${formatId}` }, { status: 400 });
    }

    // Скачиваем оригинал
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }

    const inputBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Обрезаем
    const { width, height } = dimensions;
    const outputBuffer = await sharp(inputBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    console.log(`[resize-banner] ${formatId}: ${width}×${height} done`);

    // Возвращаем как изображение
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="banner-${formatId}-${width}x${height}.png"`,
      },
    });
  } catch (error) {
    console.error('[resize-banner] Error:', error);
    return NextResponse.json({ error: 'Resize failed' }, { status: 500 });
  }
}
