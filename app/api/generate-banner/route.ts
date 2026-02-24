import { NextRequest, NextResponse } from 'next/server';

export interface GenerateBannerRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
  archetype?: string;
}

export interface GenerateBannerResponse {
  taskId: string;
  prompt: string;
}

function buildImagePrompt(req: GenerateBannerRequest): string {
  const styleMap: Record<string, string> = {
    minimal: 'minimalist, clean design, lots of whitespace, modern typography',
    bold: 'bold colors, strong contrast, impactful typography, dynamic composition',
    elegant: 'elegant, luxury aesthetic, refined typography, sophisticated color palette',
    playful: 'playful, vibrant colors, fun typography, energetic composition',
    corporate: 'professional, corporate, trustworthy, structured layout',
  };

  const archetypeMap: Record<string, string> = {
    hero: 'heroic, powerful, triumphant, achievement-focused',
    sage: 'wise, authoritative, knowledge-driven, trustworthy',
    creator: 'creative, innovative, artistic, imaginative',
    rebel: 'disruptive, edgy, bold, unconventional',
    caregiver: 'warm, nurturing, supportive, empathetic',
    explorer: 'adventurous, free-spirited, discovery-oriented',
    innocent: 'pure, optimistic, simple, honest',
    magician: 'transformative, visionary, mystical, inspiring',
    ruler: 'authoritative, premium, commanding, prestigious',
    lover: 'passionate, intimate, sensual, relationship-focused',
    jester: 'fun, humorous, light-hearted, entertaining',
    everyman: 'relatable, friendly, down-to-earth, accessible',
  };

  const styleDesc = req.style ? (styleMap[req.style] || req.style) : 'modern, professional';
  const archetypeDesc = req.archetype ? (archetypeMap[req.archetype] || req.archetype) : '';

  return [
    `Advertising banner: ${req.prompt}.`,
    `Style: ${styleDesc}.`,
    archetypeDesc ? `Brand archetype mood: ${archetypeDesc}.` : '',
    'High quality, commercial advertising photography, professional graphic design.',
    'No text or typography in the image.',
    `Aspect ratio optimized for ${req.width && req.height ? `${req.width}x${req.height}` : '16:9'} banner.`,
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

    const imagePrompt = buildImagePrompt(body);
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
