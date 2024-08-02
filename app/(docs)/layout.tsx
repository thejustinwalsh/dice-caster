import {Inter} from 'next/font/google';

import type {Metadata} from 'next';

const inter = Inter({subsets: ['latin']});

export const metadata: Metadata = {
  title: 'Dice Caster API Docs',
  description: 'Naturally critical dice as a service.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
