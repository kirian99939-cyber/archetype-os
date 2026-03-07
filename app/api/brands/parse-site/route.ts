import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

  try {
    const res = await fetch(finalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CreatikaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    const get = (pattern: RegExp): string => {
      const m = html.match(pattern);
      return m?.[1]?.trim() ?? '';
    };

    const title =
      get(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/) ||
      get(/<meta[^>]+content="([^"]*)"[^>]+property="og:title"/) ||
      get(/<title[^>]*>([^<]*)<\/title>/i);

    const description =
      get(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/) ||
      get(/<meta[^>]+content="([^"]*)"[^>]+property="og:description"/) ||
      get(/<meta[^>]+name="description"[^>]+content="([^"]*)"/) ||
      get(/<meta[^>]+content="([^"]*)"[^>]+name="description"/);

    const ogImage =
      get(/<meta[^>]+property="og:image"[^>]+content="([^"]*)"/) ||
      get(/<meta[^>]+content="([^"]*)"[^>]+property="og:image"/);

    // Extract brand colors from CSS
    const colorMatches = html.match(/#[0-9a-fA-F]{6}/g) ?? [];
    const unique = Array.from(new Set(colorMatches.map(c => c.toUpperCase())));
    // Filter out common black/white/grey
    const filtered = unique.filter(c => !['#FFFFFF', '#000000', '#111111', '#222222', '#333333', '#F5F5F5', '#FAFAFA', '#EEEEEE', '#CCCCCC', '#999999', '#666666'].includes(c));
    const colors = filtered.slice(0, 5);

    return NextResponse.json({ title, description, ogImage, colors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
