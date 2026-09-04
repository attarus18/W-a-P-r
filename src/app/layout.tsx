import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/context/language-context';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-provider';
import NativeSplashScreen from '@/components/native-splash-screen';

export const metadata: Metadata = {
  title: 'WaxPro Manager',
  description: 'Gestisci la tua attività di candele artigianali con facilità.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NativeSplashScreen />
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
