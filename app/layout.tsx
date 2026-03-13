import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: {
    default: 'NanoMind / ZeroClaw',
    template: '%s | NanoMind',
  },
  description: 'Local-first AI assistant stack combining a Next.js control UI, a Rust edge server, and ESP32-S3 firmware.',
  applicationName: 'NanoMind',
  manifest: '/manifest.json',
  icons: {
    icon: '/nanomind-mark.svg',
    shortcut: '/nanomind-mark.svg',
    apple: '/nanomind-mark.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
