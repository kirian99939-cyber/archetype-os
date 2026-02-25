import type { Metadata } from 'next';
import { Inter, Unbounded, DM_Sans } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Архетип-Протокол — AI-платформа для рекламных креативов',
  description: 'Генерация рекламных баннеров и подбор архетипов бренда с помощью искусственного интеллекта.',
  keywords: ['реклама', 'AI', 'баннеры', 'архетипы', 'маркетинг', 'креативы'],
  openGraph: {
    title: 'Архетип-Протокол',
    description: 'AI-платформа для генерации рекламных креативов',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${unbounded.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
