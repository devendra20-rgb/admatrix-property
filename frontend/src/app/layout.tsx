import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Admatrix Property | Dubai Real Estate Advertising Automation',
  description: 'Compliant AI-powered real estate advertising automation platform for Dubai property brokers and brokerages.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-[#F0EFFF] selection:text-[#635BFF]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

