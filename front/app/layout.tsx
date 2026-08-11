import './globals.css';

import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import { UserProvider } from '@/app/entities/user/model/UserContext';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Super Player',
  description: 'Upload, stream and playlist audio and video — all in one place.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
