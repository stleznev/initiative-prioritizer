import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Initiative Prioritizer',
  description: 'Prioritise business initiatives through pairwise comparisons',
};

// Root layout for all pages. Applies i18n locale from params
export default function RootLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const { locale } = params || { locale: 'ru' };
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
