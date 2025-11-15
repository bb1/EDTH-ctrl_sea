import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Maritime Monitor - EDTH-CTRL-SEA',
  description: 'NATO maritime surveillance system for Baltic Sea critical infrastructure protection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

