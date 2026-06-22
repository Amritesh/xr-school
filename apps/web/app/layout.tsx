import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XR School Lab Platform',
  description: 'Offline-first XR simulation curriculum for Indian K–12 schools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
