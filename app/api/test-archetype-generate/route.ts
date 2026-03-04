import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const archetypePrompts: Record<string, string> = {
  mem: 'Meme-style advertising layout. Bold impact font aesthetic, internet culture visual language. Dynamic composition, subject occupying 70% of frame. Bright saturated colors on solid or simple background. High quality commercial photography meets internet humor. Shot with wide angle lens, high contrast, energetic mood.',
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

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { product, description, audience, archetypeId } = await req.json();

    if (!product || !archetypeId) {
      return NextResponse.json({ error: 'product and archetypeId are required' }, { status: 400 });
    }

    const visualStyle = archetypePrompts[archetypeId] || archetypeId;

    // Simple headline from product name (no Claude call for speed)
    const headline = description
      ? description.split(/[.!?,]/).filter(Boolean)[0]?.trim().slice(0, 40) || product
      : product;

    const prompt = [
      `Advertising banner: ${product}.`,
      description ? `${description}.` : '',
      audience ? `Target audience: ${audience}.` : '',
      `Visual style: ${visualStyle}.`,
      'High quality, commercial advertising photography, professional graphic design.',
      `Include the following text overlay: "${headline}" as main headline text, large and readable.`,
      'Square composition 1080x1080. No watermarks.',
      'All text on the banner must be in Russian only.',
    ].filter(Boolean).join(' ');

    // Send to NanoBanana (1K for speed)
    const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspectRatio: '1:1',
        resolution: '1K',
      }),
    });

    const data = await res.json();
    const taskId = data?.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'No taskId', archetypeId, timeMs: Date.now() - startTime }, { status: 500 });
    }

    // Poll record-info up to 60 seconds (12 attempts x 5s)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const statusRes = await fetch(
        `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}` } },
      );

      const statusData = await statusRes.json();
      const imageUrl = statusData.data?.response?.resultImageUrl
        || statusData.data?.imageUrl
        || statusData.data?.result_urls?.[0];
      const successFlag = statusData.data?.successFlag;

      if (successFlag === 1 && imageUrl) {
        return NextResponse.json({ success: true, imageUrl, archetypeId, timeMs: Date.now() - startTime });
      }

      if (successFlag === 2 || successFlag === 3) {
        return NextResponse.json({ success: false, error: 'Generation failed', archetypeId, timeMs: Date.now() - startTime });
      }
    }

    return NextResponse.json({ success: false, error: 'Timeout 60s', archetypeId, timeMs: Date.now() - startTime });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      archetypeId: 'unknown',
      timeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
