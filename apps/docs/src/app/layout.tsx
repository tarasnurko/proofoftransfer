import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: {
    template: '%s | Proof of Transfer Docs',
    default: 'Proof of Transfer Docs',
  },
  description:
    'Documentation for Proof of Transfer — a ZK proof system for ERC-20 token transfers',
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
