import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOCS_URL ?? 'http://localhost:3001'),
  title: {
    template: '%s | Proof of Transfer Docs',
    default: 'Proof of Transfer Docs',
  },
  description:
    'Documentation for Proof of Transfer — a ZK proof system for ERC-20 token transfers',
  icons: {
    icon: '/favicons/android-chrome-192x192.png',
    apple: '/favicons/apple-touch-icon.png',
  },
  openGraph: {
    siteName: 'Proof of Transfer Docs',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
