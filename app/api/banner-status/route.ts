import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

async function saveSlideToStorage(imageUrl: string, userId: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `${userId}/${Date.now()}-slide.jpg`;

    const { data, error } = await supabaseAdmin.storage
      .from('funnel-slides')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error || !data) return imageUrl;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('funnel-slides')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch {
    return imageUrl;
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NANO_BANANA_API_KEY) {
      return NextResponse.json(
        { error: 'NANO_BANANA_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `NanoBanana status error (${res.status}): ${res.statusText}` },
        { status: res.status }
      );
    }

    const statusData = await res.json();
    console.log('[NanoBanana] record-info full response:', JSON.stringify(statusData, null, 2));

    let imageUrl = statusData.data?.response?.resultImageUrl || statusData.data?.result_urls?.[0];
    const isReady = !!imageUrl && statusData.data?.successFlag === 1;

    // Save to Supabase Storage for permanent URL
    if (isReady && imageUrl) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token?.email) {
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', token.email)
          .maybeSingle();

        if (dbUser) {
          imageUrl = await saveSlideToStorage(imageUrl, dbUser.id);
        }
      }
    }

    return NextResponse.json({ ready: isReady, imageUrl });
  } catch (error) {
    console.error('Banner status API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
