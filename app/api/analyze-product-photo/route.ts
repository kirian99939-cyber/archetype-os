import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json();

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  try {
    // Fetch image and convert to base64
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.split(';')[0].trim() as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 }
          },
          {
            type: 'text',
            text: `Ты маркетолог. Посмотри на это фото продукта и определи:
1. Что это за продукт (1-2 слова)
2. Целевая аудитория (кто купит)
3. Главное УТП / оффер (почему купят)
4. Контекст / характеристики (3-4 ключевых свойства через запятую)

Ответь строго в JSON без markdown:
{
  "product": "...",
  "audience": "...",
  "offer": "...",
  "characteristics": "..."
}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('analyze-product-photo error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to analyze photo' }, { status: 500 });
  }
}
