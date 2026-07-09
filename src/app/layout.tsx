import type { Metadata } from 'next';
import { Inter, Raleway, Noto_Sans } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway' });
const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto' });

export const metadata: Metadata = {
  title: 'WM Muebles Contemporáneos — ERP',
    description: 'Sistema de gestión interna',
    icons: {
        icon: '/icon.png',
        apple: '/icon.png',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
          <body className={`${inter.variable} ${raleway.variable} ${notoSans.variable} font-sans`}>
              <AuthProvider>
                  {children}
              </AuthProvider>
          </body>
    </html>
  );
}
