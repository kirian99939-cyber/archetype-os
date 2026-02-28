import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, spendCredits } from '@/lib/supabase';
import { ARCHETYPES, type TextRules } from '@/lib/archetypes';

export interface GenerateBannerRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
  archetype?: string;
  offer?: string;
  /** URLs of product photos to use as the main visual (uploaded or linked) */
  imageUrls?: string[];
  /** Tone of voice for text generation */
  toneOfVoice?: string;
}

export interface GenerateBannerResponse {
  taskId: string;
  prompt: string;
}

interface BannerText {
  headline: string;
  offer: string;
  cta: string;
}

const styleDescriptions: Record<TextRules['style'], string> = {
  elegant: 'короткий, изысканный, без лишних слов',
  bold: 'мощный, прямой, энергичный',
  conversational: 'живой, человечный, разговорный',
  provocative: 'провокационный, неожиданный, смелый',
  playful: 'игривый, лёгкий, с юмором',
  scientific: 'точный, с конкретными фактами и цифрами',
};

const toneInstructions: Record<string, string> = {
  friendly: 'Тон: дружелюбный, на «ты». Неформальный язык, как для друга.',
  formal: 'Тон: профессиональный, на «вы». Уважительный, деловой стиль.',
  provocative: 'Тон: провокационный, дерзкий. Вызывающие формулировки.',
  expert: 'Тон: экспертный, авторитетный. Цифры, факты, конкретика.',
};

const levelDescriptions: Record<TextRules['level'], string> = {
  minimal: 'Только название бренда или слоган — 1–3 слова',
  medium: 'Заголовок 5–7 слов + короткий CTA 2–4 слова. Оффер не нужен.',
  full: 'Заголовок 5–8 слов + оффер/подзаголовок 8–12 слов + CTA 2–4 слова',
};

async function generateBannerText(
  brief: string,
  archetype: string,
  textRules: TextRules,
  offer?: string,
  toneOfVoice?: string,
): Promise<BannerText> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const offerInstruction = offer
    ? `\nОффер клиента: "${offer}"\nАдаптируй этот оффер под стиль архетипа, НЕ меняя ключевой смысл и конкретные факты (числа, сроки, условия).`
    : '';

  const toneInstruction = toneOfVoice && toneInstructions[toneOfVoice]
    ? `\n${toneInstructions[toneOfVoice]}`
    : '';

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Ты копирайтер. Придумай текст для рекламного баннера.

Бриф: ${brief}
Архетип: ${archetype}
Уровень текста: ${levelDescriptions[textRules.level]}
Стиль текста: ${styleDescriptions[textRules.style]}${toneInstruction}${offerInstruction}

Верни ТОЛЬКО валидный JSON без пояснений:
{
  "headline": "${textRules.level === 'minimal' ? 'название бренда или слоган (1-3 слова)' : 'заголовок'}",
  "offer": "${textRules.includeOffer ? 'оффер или подзаголовок' : ''}",
  "cta": "${textRules.includeCta ? 'призыв к действию' : ''}"
}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');

  return JSON.parse(jsonMatch[0]);
}

const SAFE_ZONE_HINTS: Record<string, string> = {
  stories: 'Layout note: Stories format — avoid placing text in the top 15% (status bar, clock) and bottom 18% (swipe-up area, reply bar). The rest of the image is free for creative text placement — top-third, center, lower-third are all fine.',
  feed: 'Layout note: Square feed post — avoid placing key text in the bottom 8% where action buttons may overlap. Otherwise text can go anywhere.',
  feed_vertical: 'Layout note: Vertical feed post — bottom 12% may be partially cropped in some feeds. Place the most important text (headline, CTA) above that zone. Otherwise creative freedom for layout.',
  banner: 'Layout note: Horizontal banner — avoid the outer 5% margins. Text can be placed freely: left-aligned, centered, right-side — vary the composition.',
  post_wide: 'Layout note: Wide post format — keep key text within the inner 90% of the image.',
  rsya_vertical: 'Layout note: Small vertical ad — use large, bold text for readability at small sizes. Keep text concise.',
};

const SIZE_TO_FORMAT: Record<string, string> = {
  '1080x1920': 'stories',
  '1080x1080': 'feed',
  '1080x1350': 'feed_vertical',
  '1920x1080': 'banner',
  '1080x607':  'post_wide',
  '240x400':   'rsya_vertical',
};

function buildImagePrompt(req: GenerateBannerRequest, bannerText: BannerText | null, offer?: string, imageUrls?: string[]): string {
  const archetypeVisualMap: Record<string, string> = {
    mem: 'meme-style layout, bold impact font, internet culture aesthetics',
    trend: 'trending aesthetic, current visual style, hype atmosphere',
    aesthetic: 'clean composition, curated color palette, minimal whitespace',
    cringe: 'intentionally kitschy design, retro clip-art, over-the-top colors',
    wow: 'cinematic dramatic lighting, hero product shot, epic composition',
    acid: 'neon colors, glitch effects, cyberpunk vibe, electric atmosphere',
    zhiza: 'relatable everyday setting, cozy home environment, realistic lifestyle',
    premium: 'dark luxury background, noble materials, ultra-minimal layout',
    nostalgia: 'VHS grain, retro color grading, vintage typography, 90s aesthetic',
    story: 'before/after split, problem-solution visual narrative',
    social_proof: 'star ratings overlay, testimonial layout, trust badges',
    shock: 'unexpected visual contrast, paradoxical imagery, attention-grabbing',
    science: 'laboratory aesthetic, data visualization, clean technical layout',
    asmr: 'soft lighting, macro texture close-ups, tactile warmth',
    gamification: 'game UI elements, quest style, progress bars, pixel accents',
    surreal: 'levitation, impossible physics, dreamlike magical atmosphere',
    cultural: 'local cultural symbols, traditional patterns, community imagery',
    hyperbole: 'epic exaggerated scale, over-the-top drama, explosive energy',
    cinematic: 'movie frame composition, film genre aesthetics, dramatic scene',
    cat: 'adorable cat with product, soft warm lighting, minimal text space',
    eco: 'natural green background, organic textures, eco-friendly imagery',
    cute: 'pastel colors, soft textures, miniature product, kawaii aesthetic',
    pov: 'first-person perspective, hands in frame, active POV shot',
    celebrity: 'authoritative presence, intellectual atmosphere, inspired aesthetic',
    badgood: 'intentionally low-quality look, anti-design, raw unpolished style',
  };

  const archetypeDesc = req.archetype ? (archetypeVisualMap[req.archetype] || req.archetype) : '';

  const textInstructions: string[] = [];
  if (bannerText) {
    if (bannerText.headline) textInstructions.push(`Main headline text: "${bannerText.headline}"`);
    if (bannerText.offer) textInstructions.push(`Subheadline/offer text: "${bannerText.offer}"`);
    else if (offer) textInstructions.push(`Subheadline/offer text: "${offer}"`);
    if (bannerText.cta) textInstructions.push(`CTA button text: "${bannerText.cta}"`);
  } else if (offer) {
    textInstructions.push(`Offer text: "${offer}"`);
  }

  const hasProductImages = imageUrls && imageUrls.length > 0;

  const formatKey = req.width && req.height ? SIZE_TO_FORMAT[`${req.width}x${req.height}`] : undefined;
  const safeZoneHint = formatKey ? SAFE_ZONE_HINTS[formatKey] : '';

  return [
    `Advertising banner: ${req.prompt}.`,
    hasProductImages ? 'Incorporate the provided reference image naturally into the composition — use it as a key visual element but integrate it with the overall design concept.' : '',
    archetypeDesc ? `Visual style: ${archetypeDesc}.` : '',
    'High quality, commercial advertising photography, professional graphic design.',
    textInstructions.length > 0
      ? `Include the following text overlays EXACTLY ONCE each — do NOT duplicate any text: ${textInstructions.join('. ')}.`
      : 'No text or typography in the image.',
    `Aspect ratio optimized for ${req.width && req.height ? `${req.width}x${req.height}` : '16:9'} banner.`,
    safeZoneHint,
    'ВАЖНО: Весь текст на баннере должен быть ТОЛЬКО на русском языке. Заголовок, CTA кнопка, любой текст — всё только по-русски.',
  ]
    .filter(Boolean)
    .join(' ');
}

const SUPPORTED_RATIOS = ['1:1', '4:5', '9:16', '16:9', '3:4', '4:3'];

function getAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return '16:9';

  // Вычисляем точное соотношение через GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  const exact = `${width / d}:${height / d}`;

  // Если точное соотношение поддерживается — используем
  if (SUPPORTED_RATIOS.includes(exact)) return exact;

  // Иначе находим ближайшее поддерживаемое по реальной пропорции
  const target = width / height;
  let best = SUPPORTED_RATIOS[0];
  let bestDiff = Infinity;
  for (const ratio of SUPPORTED_RATIOS) {
    const [w, h] = ratio.split(':').map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = ratio;
    }
  }
  return best;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NANO_BANANA_API_KEY) {
      return NextResponse.json(
        { error: 'NANO_BANANA_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const body: GenerateBannerRequest = await req.json();

    if (!body.prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // ── Авторизация и проверка кредитов (для КАЖДОГО запроса) ──
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.email) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Ищем пользователя в Supabase по email
    let { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id, credits')
      .eq('email', token.email)
      .maybeSingle();

    // Edge case: пользователь есть в Auth, но нет в таблице users — создаём
    if (!dbUser) {
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({
          email:      token.email as string,
          name:       (token.name as string) ?? null,
          avatar_url: (token.picture as string) ?? null,
          credits:    100,
        })
        .select('id, credits')
        .single();

      if (!newUser) {
        return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
      }
      dbUser = newUser;
    }

    // Проверяем баланс ПЕРЕД любым вызовом NanoBanana (нужно минимум 10 кредитов)
    if (dbUser.credits < 10) {
      return NextResponse.json({ error: 'NO_CREDITS', required: 10, available: dbUser.credits }, { status: 402 });
    }

    // Списываем 10 кредитов за каждый баннер
    const spent = await spendCredits(dbUser.id, 10);
    if (!spent) {
      return NextResponse.json({ error: 'NO_CREDITS', required: 10, available: dbUser.credits }, { status: 402 });
    }
    console.log(`[Credits] Spent 10 credits for user ${dbUser.id}. Was: ${dbUser.credits}, now: ${dbUser.credits - 10}`);

    // Генерируем текст через Claude если есть textRules для архетипа
    let bannerText: BannerText | null = null;
    if (body.archetype) {
      const archetypeDef = ARCHETYPES.find(a => a.id === body.archetype);
      if (archetypeDef?.textRules) {
        try {
          bannerText = await generateBannerText(body.prompt, body.archetype, archetypeDef.textRules, body.offer, body.toneOfVoice);
          console.log('[Banner] Generated text:', bannerText);
        } catch (err) {
          console.warn('[Banner] Claude text generation failed, skipping:', err);
        }
      }
    }

    const activeImageUrls = body.imageUrls?.filter(Boolean);
    const imagePrompt = buildImagePrompt(body, bannerText, body.offer, activeImageUrls);
    const aspectRatio = getAspectRatio(body.width, body.height);

    const nanoBananaPayload: Record<string, unknown> = {
      prompt: imagePrompt,
      resolution: '2K',
      aspectRatio,
    };
    if (activeImageUrls && activeImageUrls.length > 0) {
      nanoBananaPayload.imageUrls = activeImageUrls;
    }

    const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nanoBananaPayload),
    });

    console.log('[generate-banner] NanoBanana response status:', res.status);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.log('[generate-banner] NanoBanana error body:', JSON.stringify(errorData).slice(0, 500));
      const errorMessage = errorData?.message ?? res.statusText;
      return NextResponse.json(
        { error: `NanoBanana API error (${res.status}): ${errorMessage}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[generate-banner] NanoBanana response body:', JSON.stringify(data).slice(0, 500));

    const taskId = data?.data?.taskId;
    if (!taskId) {
      throw new Error('No taskId in NanoBanana API response');
    }

    return NextResponse.json({ taskId, prompt: imagePrompt } satisfies GenerateBannerResponse);
  } catch (error) {
    console.error('Generate banner API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
