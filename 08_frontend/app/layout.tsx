import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credit Risk Engine | COBAC Dashboard",
  description: "Plateforme MLOps de gestion du risque de credit - Conforme COBAC, Basel III, IFRS 9",
};

import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { Sidebar } from "@/components/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] antialiased transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <I18nProvider>
            <div className="grid grid-cols-[256px_1fr] min-h-screen w-full relative bg-radial-premium">
              <div className="sticky top-0 h-screen">
                <Sidebar />
              </div>
              <main className="flex-1 bg-[var(--bg-secondary)] overflow-x-hidden">
                <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
                  <div className="text-sm text-[var(--text-muted)] font-medium">Dashboard</div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-[var(--border-subtle)]" />
                  </div>
                </header>
                <div className="p-8 max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
