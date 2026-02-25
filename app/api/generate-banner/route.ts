import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, spendCredit } from '@/lib/supabase';
import { ARCHETYPES, type TextRules } from '@/lib/archetypes';

export interface GenerateBannerRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
  archetype?: string;
  offer?: string;
  /** true только для первого запроса в пакете — списывает 1 кредит */
  isFirstBanner?: boolean;
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
): Promise<BannerText> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const offerInstruction = offer
    ? `\nОффер клиента: "${offer}"\nАдаптируй этот оффер под стиль архетипа, НЕ меняя ключевой смысл и конкретные факты (числа, сроки, условия).`
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
Стиль текста: ${styleDescriptions[textRules.style]}${offerInstruction}

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

function buildImagePrompt(req: GenerateBannerRequest, bannerText: BannerText | null, offer?: string): string {
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

  return [
    `Advertising banner: ${req.prompt}.`,
    archetypeDesc ? `Visual style: ${archetypeDesc}.` : '',
    'High quality, commercial advertising photography, professional graphic design.',
    textInstructions.length > 0
      ? `Include the following text overlays: ${textInstructions.join('. ')}.`
      : 'No text or typography in the image.',
    `Aspect ratio optimized for ${req.width && req.height ? `${req.width}x${req.height}` : '16:9'} banner.`,
    'ВАЖНО: Весь текст на баннере должен быть ТОЛЬКО на русском языке. Заголовок, CTA кнопка, любой текст — всё только по-русски.',
  ]
    .filter(Boolean)
    .join(' ');
}

function getAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return '16:9';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
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

    // ── Проверка и списание кредитов (только для первого баннера в пакете) ──
    if (body.isFirstBanner) {
      // getToken reads the JWT directly from the cookie — reliable in App Router route handlers
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

      if (!token?.email) {
        return NextResponse.json(
          { error: 'Необходима авторизация' },
          { status: 401 }
        );
      }

      // Look up user in Supabase by email
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, credits')
        .eq('email', token.email)
        .maybeSingle();

      if (!dbUser) {
        // User missing in DB (edge case) — create them
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            email:      token.email as string,
            name:       (token.name as string) ?? null,
            avatar_url: (token.picture as string) ?? null,
            credits:    3,
          })
          .select('id, credits')
          .single();

        if (!newUser) {
          return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
        }

        await spendCredit(newUser.id);
        console.log(`[Credits] New user ${newUser.id}. Spent 1 credit. Remaining: 2`);
      } else {
        if (dbUser.credits <= 0) {
          return NextResponse.json({ error: 'NO_CREDITS' }, { status: 403 });
        }

        await spendCredit(dbUser.id);
        console.log(`[Credits] Spent 1 credit for user ${dbUser.id}. Remaining: ${dbUser.credits - 1}`);
      }
    }

    // Генерируем текст через Claude если есть textRules для архетипа
    let bannerText: BannerText | null = null;
    if (body.archetype) {
      const archetypeDef = ARCHETYPES.find(a => a.id === body.archetype);
      if (archetypeDef?.textRules) {
        try {
          bannerText = await generateBannerText(body.prompt, body.archetype, archetypeDef.textRules, body.offer);
          console.log('[Banner] Generated text:', bannerText);
        } catch (err) {
          console.warn('[Banner] Claude text generation failed, skipping:', err);
        }
      }
    }

    const imagePrompt = buildImagePrompt(body, bannerText, body.offer);
    const aspectRatio = getAspectRatio(body.width, body.height);

    const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: imagePrompt, resolution: '2K', aspectRatio }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData?.message ?? res.statusText;
      return NextResponse.json(
        { error: `NanoBanana API error (${res.status}): ${errorMessage}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[NanoBanana] create response:', JSON.stringify(data, null, 2));

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
