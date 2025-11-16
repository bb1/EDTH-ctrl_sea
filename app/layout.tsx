import type { Metadata } from 'next';
import './globals.css';
import { DataSourceProvider } from './contexts/DataSourceContext';

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
      <body className="antialiased">
        <DataSourceProvider>{children}</DataSourceProvider>
      </body>
    </html>
  );
}

