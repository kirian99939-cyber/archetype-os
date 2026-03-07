import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, spendCredits } from '@/lib/supabase';
import { PLATFORM_CONFIG } from '@/lib/funnel-types';
import type { FunnelPlatform, InstagramSubtype } from '@/lib/funnel-types';

interface FunnelRequest {
  platform: FunnelPlatform;
  subtype?: InstagramSubtype;
  slideCount: number;
  product: string;
  audience: string;
  offer: string;
  characteristics: string;
  brandId?: string;
}

const STYLE_PROMPTS: Record<string, string> = {
  'product-focused': 'Clean product photography style. White or light neutral background, professional studio lighting, commercial quality. Focus on product details and usability.',
  infographic: 'Modern infographic style with clean layout. White background, bold typography zones, icon-style visual elements. Data-driven, marketplace-optimized product card aesthetic.',
  storytelling: 'Instagram-native visual storytelling. Bold typography, engaging composition, social media optimized. Eye-catching colors and dynamic layout.',
  'bold-minimal': 'Bold minimal stories aesthetic. Large impactful typography, high contrast, vertical 9:16 composition. Attention-grabbing in first 0.5 seconds.',
};

const SUPPORTED_RATIOS = ['1:1', '4:5', '9:16', '16:9', '3:4', '4:3'];

function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  const exact = `${width / d}:${height / d}`;
  if (SUPPORTED_RATIOS.includes(exact)) return exact;

  const target = width / height;
  let best = SUPPORTED_RATIOS[0];
  let bestDiff = Infinity;
  for (const ratio of SUPPORTED_RATIOS) {
    const [w, h] = ratio.split(':').map(Number);
    const diff = Math.abs(w / h - target);
    if (diff < bestDiff) { bestDiff = diff; best = ratio; }
  }
  return best;
}

function buildSlidePrompt(
  slideDesc: string,
  slideIndex: number,
  totalSlides: number,
  body: FunnelRequest,
  platformStyle: string,
): string {
  return [
    `Advertising slide ${slideIndex + 1} of ${totalSlides} for a photo funnel.`,
    `Slide purpose: ${slideDesc}.`,
    `Product: ${body.product}.`,
    body.offer ? `Key offer: ${body.offer}.` : '',
    body.characteristics ? `Key features: ${body.characteristics}.` : '',
    `Target audience: ${body.audience}.`,
    `Visual style: ${STYLE_PROMPTS[platformStyle] || platformStyle}.`,
    'High quality, commercial advertising photography, professional graphic design.',
    'IMPORTANT: All text on the slide must be ONLY in Russian language.',
    slideIndex === 0 ? 'This is the HERO slide — make it the most eye-catching and attention-grabbing.' : '',
    slideIndex === totalSlides - 1 ? 'This is the FINAL CTA slide — include a clear call to action.' : '',
  ].filter(Boolean).join(' ');
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NANO_BANANA_API_KEY) {
      return NextResponse.json({ error: 'NANO_BANANA_API_KEY not configured' }, { status: 500 });
    }

    const body: FunnelRequest = await req.json();
    const config = PLATFORM_CONFIG[body.platform];
    if (!config) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    if (!body.product || !body.audience) {
      return NextResponse.json({ error: 'product and audience are required' }, { status: 400 });
    }

    // Auth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id, credits')
      .eq('email', token.email)
      .maybeSingle();

    if (!dbUser) {
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({ email: token.email as string, name: (token.name as string) ?? null, avatar_url: (token.picture as string) ?? null, credits: 100 })
        .select('id, credits')
        .single();
      if (!newUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      dbUser = newUser;
    }

    const slideCount = Math.min(Math.max(body.slideCount, config.minSlides), config.maxSlides);
    const creditsNeeded = slideCount * 10;
    if (dbUser.credits < creditsNeeded) {
      return NextResponse.json({ error: 'NO_CREDITS', required: creditsNeeded, available: dbUser.credits }, { status: 402 });
    }

    // Determine slide structure
    let slideStructure = config.slideStructure;
    if (body.platform === 'instagram' && body.subtype && config.subtypes) {
      const sub = config.subtypes[body.subtype];
      if (sub) slideStructure = sub.slideStructure;
    }

    // Build slide descriptions for requested count
    const slideDescs: string[] = [];
    for (let i = 0; i < slideCount; i++) {
      slideDescs.push(slideStructure[i % slideStructure.length]);
    }

    const aspectRatio = getAspectRatio(config.format.width, config.format.height);

    // Generate slides sequentially
    const slides: { index: number; taskId: string; description: string }[] = [];

    for (let i = 0; i < slideCount; i++) {
      const prompt = buildSlidePrompt(slideDescs[i], i, slideCount, body, config.style);

      const nanoBananaPayload = {
        prompt,
        resolution: '2K',
        aspectRatio,
      };

      const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nanoBananaPayload),
      });

      if (!res.ok) {
        console.error(`[generate-funnel] Slide ${i} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const taskId = data?.data?.taskId;
      if (!taskId) continue;

      // Spend credits per slide
      await spendCredits(dbUser.id, 10);

      slides.push({ index: i, taskId, description: slideDescs[i] });

      // Small delay between requests
      if (i < slideCount - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (slides.length === 0) {
      return NextResponse.json({ error: 'Failed to generate any slides' }, { status: 500 });
    }

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('[generate-funnel] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
