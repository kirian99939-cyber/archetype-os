import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const refCode = req.nextUrl.searchParams.get('ref');
  if (!refCode) return NextResponse.next();

  // Сохраняем реферальный код в cookie на 30 дней
  const res = NextResponse.next();
  res.cookies.set('referral_code', refCode, {
    maxAge: 60 * 60 * 24 * 30, // 30 дней
    path: '/',
    httpOnly: false, // доступен из JS для чтения
    sameSite: 'lax',
  });
  return res;
}

export const config = {
  matcher: ['/', '/landing', '/dashboard', '/project/:path*'],
};
