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
  sensual: 'чувственный, интригующий, с сексуальным намёком — не пошлый, но притягательный. Метафоры тела: прикосновение, тепло кожи, дыхание, изгибы',
  mysterious: 'таинственный, элитарный, конспирологический. Язык спецслужб: доступ, допуск, рассекречено, только для своих',
};

const toneInstructions: Record<string, string> = {
  friendly: 'Тон: дружелюбный, на «ты». Неформальный язык, как для друга.',
  formal: 'Тон: профессиональный, на «вы». Уважительный, деловой стиль.',
  provocative: 'Тон: провокационный, дерзкий. Вызывающие формулировки.',
  expert: 'Тон: экспертный, авторитетный. Цифры, факты, конкретика.',
  sensual: 'Тон: чувственный, интригующий. Метафоры тела, прикосновений, удовольствия.',
  mysterious: 'Тон: засекреченный, элитарный. Создаёт ощущение доступа к запретному.',
};

const levelDescriptions: Record<TextRules['level'], string> = {
  minimal: 'Только 1-3 слова. Название или слоган. offer и cta оставь пустыми "".',
  medium: 'headline 3-5 слов + cta 2-3 слова. offer оставь пустым "".',
  full: 'headline 4-5 слов + offer до 7 слов + cta 2-3 слова. Максимум 15 слов всего.',
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
    ? `\nАдаптируй этот оффер КОРОТКО (максимум 7 слов): "${offer}"`
    : '';

  const toneInstruction = toneOfVoice && toneInstructions[toneOfVoice]
    ? `\n${toneInstructions[toneOfVoice]}`
    : '';

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Ты — арт-директор рекламного агентства. Твоя задача — написать МИНИМУМ текста для визуального баннера. Баннер — это картинка, не статья. Каждое лишнее слово убивает дизайн.

Уровень текста: ${levelDescriptions[textRules.level]}

ЖЁСТКИЕ ПРАВИЛА:
- headline: МАКСИМУМ 5 слов. Лучше 3-4. Это главный крючок.
- offer: МАКСИМУМ 7 слов. Только суть. Если нечего сказать — оставь пустым "".
- cta: МАКСИМУМ 3 слова. Глагол + существительное.
- ОБЩИЙ ЛИМИТ: не больше 15 слов на весь баннер.
- НЕ используй кавычки внутри текста.
- НЕ ставь точку в конце headline и cta.
- Пиши как для билборда на трассе — водитель видит 2 секунды.

Бриф: ${brief}
Архетип: ${archetype}
Стиль текста: ${styleDescriptions[textRules.style]}${toneInstruction}${offerInstruction}

Верни ТОЛЬКО валидный JSON:
{"headline": "...", "offer": "...", "cta": "..."}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');

  return JSON.parse(jsonMatch[0]);
}

const SAFE_ZONE_HINTS: Record<string, string> = {
  stories: 'Composition note: Keep all text elements in the middle section of the image. Leave clear space at the very top and very bottom edges — place headline, offer and CTA in the center zone only.',
  feed: 'Composition note: Square composition — keep all key text away from the bottom edge. Text can be placed freely in upper and center areas.',
  feed_vertical: 'Composition note: Vertical composition — place the most important text in the upper and center areas. Keep bottom edge clean.',
  banner: 'Composition note: Horizontal wide composition — keep all text within the safe inner area, away from left and right edges. Text can be left-aligned, centered, or right-side.',
  post_wide: 'Composition note: Wide horizontal composition — keep all text centered and away from outer edges.',
  rsya_vertical: 'Composition note: Compact vertical format — use large bold text for readability. Keep layout simple and text concise.',
};

const SIZE_TO_FORMAT: Record<string, string> = {
  '1080x1920': 'stories',
  '1080x1080': 'feed',
  '1080x1350': 'feed_vertical',
  '1920x1080': 'banner',
  '1080x607':  'post_wide',
  '240x400':   'rsya_vertical',
};

const archetypeNegativePrompts: Record<string, string> = {
  seduction: 'full nudity, genitals, pornographic, nsfw, vulgar, cheap, amateur, cartoon, ugly, deformed',
  'black-box': 'bright colors, cheerful, cartoon, childish, simple, flat design, cute',
};

function buildImagePrompt(req: GenerateBannerRequest, bannerText: BannerText | null, offer?: string, imageUrls?: string[]): string {
  const archetypeVisualMap: Record<string, string> = {
    mem: 'Meme-style advertising layout. Bold impact font aesthetic, internet culture visual language. Dynamic composition, subject dominating the frame. Bright saturated colors on solid or simple background. High quality commercial photography meets internet humor. Shot with wide angle lens, high contrast, energetic mood.',
    trend: 'Social media native advertising aesthetic. Dynamic composition with glitch effects and neon gradients. TikTok/Reels visual language. Purple-pink-blue neon color palette, vibrant and energetic. Looks like organic viral content, not traditional advertising. Modern and culturally relevant.',
    aesthetic: 'Minimalist luxury photography, clean composition with lots of negative space. Soft natural lighting, muted earth tones or monochrome palette. Shot on 85mm lens, shallow depth of field, f/2.0. Editorial magazine quality, calm and sophisticated mood. Premium feel without being flashy.',
    cringe: 'Intentionally kitschy design with retro clip-art aesthetic, over-the-top visual elements. Bright clashing colors, comic sans energy, stock photo irony. Deliberately tacky but self-aware. Mixed media collage style, absurdist humor.',
    wow: 'Cinematic dramatic lighting with hero product shot. Epic scale, lens flare, volumetric light rays. Shot on 24mm wide angle, low angle perspective for dramatic effect. Movie poster quality, awe-inspiring composition. Rich deep colors with golden highlights.',
    acid: 'Psychedelic neon colors, fluorescent pink-green-yellow palette. Distorted perspectives, fish-eye lens effect, rave aesthetics. High contrast, oversaturated, glowing elements. Underground club visual language. Raw energy, anti-corporate.',
    zhiza: 'Relatable everyday lifestyle photography. Cozy home environment, warm natural lighting. Realistic and authentic mood, shot on 50mm lens like a friend\'s photo. Soft warm palette, lived-in textures. Comfortable and genuine, not staged.',
    premium: 'Dark moody background with dramatic lighting, gold or warm accent highlights. Product hero shot, centered composition, reflective surface. Commercial product photography, 85mm macro lens, studio lighting. Rich textures — leather, metal, glass. Luxury brand aesthetic.',
    nostalgia: 'Warm vintage color grading with film grain effect, slightly faded tones. 70s/80s/90s photography aesthetic, period-appropriate styling. Soft warm lighting, golden hour feel. VHS scan lines subtle overlay. Nostalgic mood, authentic retro feel.',
    story: 'Before/after split composition showing problem and solution. Clean dividing line or visual transition. Left side: muted, problematic state. Right side: bright, solved state. Narrative visual structure, clear story arc in one frame.',
    social_proof: 'Trust-building visual layout with star ratings aesthetic, testimonial card style. Clean professional background, warm trustworthy lighting. Certificate/badge visual elements. Credible and reliable mood, corporate-friendly but warm.',
    shock: 'High contrast dramatic composition with unexpected visual juxtaposition. Bold colors — red, black, neon. Eye-catching and provocative. Wide angle lens for dramatic effect, low angle shot. Gritty but professional, editorial edge.',
    science: 'Clean infographic aesthetic on white or light lab background. Scientific visualization style with data-driven look. Bright clinical lighting, cool blue-white palette. Modern and trustworthy. Flat lay or isometric perspective, precise composition.',
    asmr: 'Extreme macro photography showing soft textures and tactile details. Soft diffused lighting creating gentle shadows. Warm intimate color palette, shallow depth of field. Sensory and soothing mood, every texture visible. Shot on macro lens, f/2.8.',
    gamification: 'Game UI inspired visual design with quest-style elements. Pixel art accents mixed with modern photography. Achievement badge aesthetic, progress bar visual language. Bright playful colors, game reward excitement. Level-up energy.',
    surreal: 'Surrealist photography with impossible physics and dreamlike atmosphere. Unexpected scale shifts, floating objects, melting elements. Rich saturated colors with dramatic shadows. Cinematic lighting. Salvador Dali meets modern advertising.',
    cultural: 'Local cultural symbols woven into modern advertising. Traditional patterns as design elements, heritage color palette. Respectful fusion of tradition and contemporary style. Rich cultural textures, artisan quality feel.',
    hyperbole: 'Epic exaggerated scale with explosive energy. Giant product towering over cityscape or tiny people. Dynamic action lines, impact effects. Superhero movie energy, maximum drama. Wide angle, dramatic perspective distortion.',
    cinematic: 'Movie frame composition with cinematic aspect ratio feel. Film genre aesthetics — noir, thriller, romance depending on product. Anamorphic lens flare, color grading like a film still. Director-level staging, every element intentional.',
    cat: 'Adorable cat interacting with or near the product. Soft warm studio lighting, shallow depth of field. Cat is the hero — curious, playful, or regal pose. Cozy atmosphere, Instagram-worthy pet photography. Warm palette, sharp focus on cat.',
    eco: 'Natural green environment with organic textures. Eco-friendly aesthetic — leaves, wood, natural fibers. Soft natural daylight, earth tone palette. Sustainable and fresh mood, morning dew quality. Clean and pure composition.',
    cute: 'Soft pastel color palette with rounded shapes and gentle lighting. Kawaii-inspired aesthetic, warm and inviting mood. Close-up shot, shallow depth of field. Plush textures, soft shadows, dreamy atmosphere. Adorable without being childish.',
    pov: 'First-person perspective with hands visible in frame. POV angle as if viewer is interacting with product. Natural lighting, realistic environment. Immersive and personal, Instagram story aesthetic. Shot on wide angle, authentic mood.',
    celebrity: 'Authoritative intellectual atmosphere with confident presence. TED talk staging quality, professional studio backdrop. Warm key light, subtle rim light. Credible expert energy, books or professional props. Portrait photography, 85mm lens.',
    badgood: 'Intentionally low-quality anti-design aesthetic. Raw, unpolished, amateur feel — flash photography, slight blur, messy composition. Authentic and rebellious, anti-advertising advertising. Lo-fi charm, screenshot aesthetic.',
    seduction: 'Elegant silhouettes with chiaroscuro lighting creating mystery and allure. Soft bokeh background, warm intimate color palette. Sensual but tasteful — Victoria\'s Secret inspired aesthetic. Silk and velvet textures, candlelight warmth. Shot on 85mm, very shallow depth of field.',
    'black-box': 'Classified document aesthetic with dark moody cyberpunk noir atmosphere. Redacted text visual elements, dark tech interface overlays. Matrix-green or amber on black palette. Mysterious and exclusive, secret society energy. Dramatic side lighting, sharp shadows.',
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
    `Optimized composition for ${req.width && req.height ? `${req.width}:${req.height}` : 'standard'} format.`,
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
    // НО не списываем — списание только ПОСЛЕ успешной генерации
    if (dbUser.credits < 10) {
      return NextResponse.json({ error: 'NO_CREDITS', required: 10, available: dbUser.credits }, { status: 402 });
    }

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
    // Передаём negative prompt для определённых архетипов (критично для seduction)
    const negPrompt = body.archetype ? archetypeNegativePrompts[body.archetype] : undefined;
    if (negPrompt) {
      nanoBananaPayload.negative_prompt = negPrompt;
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
      // Генерация не удалась — кредиты НЕ списаны
      console.log(`[Credits] Generation failed for user ${dbUser.id}, credits NOT deducted`);
      return NextResponse.json(
        { error: `Генерация не удалась. Кредиты не списаны — попробуйте ещё раз. (${res.status}: ${errorMessage})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[generate-banner] NanoBanana response body:', JSON.stringify(data).slice(0, 500));

    const taskId = data?.data?.taskId;
    if (!taskId) {
      // Нет taskId — кредиты НЕ списаны
      console.log(`[Credits] No taskId for user ${dbUser.id}, credits NOT deducted`);
      return NextResponse.json(
        { error: 'Генерация не удалась. Кредиты не списаны — попробуйте ещё раз.' },
        { status: 500 }
      );
    }

    // Генерация успешна — ТЕПЕРЬ списываем кредиты (оптимистичная блокировка)
    const spent = await spendCredits(dbUser.id, 10);
    if (!spent) {
      // Генерация прошла, но кредиты не списались (параллельный запрос изменил баланс)
      // Лучше отдать результат, чем потерять и генерацию, и кредиты
      console.error(`[Credits] WARN: Generation succeeded but credit deduction failed for user ${dbUser.id}. TaskId: ${taskId}`);
    } else {
      console.log(`[Credits] Spent 10 credits for user ${dbUser.id} AFTER successful generation. Was: ${dbUser.credits}, now: ${dbUser.credits - 10}. TaskId: ${taskId}`);
    }

    return NextResponse.json({ taskId, prompt: imagePrompt } satisfies GenerateBannerResponse);
  } catch (error) {
    // Генерация упала — кредиты НЕ списаны
    console.error('Generate banner API error (credits NOT deducted):', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Генерация не удалась. Кредиты не списаны — попробуйте ещё раз.${message ? ` (${message})` : ''}` },
      { status: 500 }
    );
  }
}
