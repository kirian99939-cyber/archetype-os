import type { Metadata } from 'next';
import { Inter, Unbounded, DM_Sans } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import ProdamusScript from '@/components/ProdamusScript';
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
  title: 'Креатика — AI-платформа для создания рекламных баннеров',
  description: 'Генерация рекламных баннеров на основе психологических архетипов. Создавайте эффективную рекламу с помощью AI.',
  keywords: ['реклама', 'AI', 'баннеры', 'архетипы', 'маркетинг', 'креативы', 'креатика'],
  openGraph: {
    title: 'Креатика',
    description: 'AI-платформа для создания рекламных баннеров на основе психологических архетипов',
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
        <ProdamusScript />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
