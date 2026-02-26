import sharp from 'sharp';

/**
 * Целевые размеры для каждого формата баннера.
 * Ключи совпадают с BANNER_FORMATS[].key в NewProject.tsx.
 */
export const BANNER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'feed':          { width: 1080, height: 1080 },
  'feed_vertical': { width: 1080, height: 1350 },
  'stories':       { width: 1080, height: 1920 },
  'banner':        { width: 1920, height: 1080 },
  'post_wide':     { width: 1080, height: 607 },
  'rsya_vertical': { width: 240,  height: 400 },
};

/**
 * Обрезает и ресайзит изображение до точного целевого размера.
 *
 * Алгоритм:
 * 1. Берёт входное изображение (Buffer)
 * 2. Обрезает по центру до нужного соотношения сторон (crop)
 * 3. Ресайзит до точных пикселей
 * 4. Возвращает Buffer в формате PNG (или JPEG)
 */
export async function resizeBanner(
  inputBuffer: Buffer,
  formatId: string,
  outputFormat: 'png' | 'jpeg' = 'png'
): Promise<Buffer> {
  const dimensions = BANNER_DIMENSIONS[formatId];

  if (!dimensions) {
    console.warn(`[resizeBanner] Unknown format "${formatId}", returning original`);
    return inputBuffer;
  }

  const { width, height } = dimensions;

  let pipeline = sharp(inputBuffer)
    .resize(width, height, {
      fit: 'cover',       // Заполняет целевой размер, обрезая лишнее
      position: 'centre', // Обрезка по центру
    });

  if (outputFormat === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: 95 });
  } else {
    pipeline = pipeline.png();
  }

  const outputBuffer = await pipeline.toBuffer();

  console.log(`[resizeBanner] ${formatId}: resized to ${width}×${height}`);

  return outputBuffer;
}
