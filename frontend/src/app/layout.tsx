import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gRPC Security Attack Lab",
  description: "A comprehensive laboratory for learning gRPC security vulnerabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased selection:bg-primary/30`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
            <div className="container mx-auto flex h-16 items-center px-4">
              <div className="flex gap-2 items-center font-bold text-xl tracking-tight">
                <span className="text-primary bg-primary/20 p-1.5 rounded-lg">⚡</span>
                <span className="gradient-text">gRPC SecLab</span>
              </div>
              <nav className="ml-auto flex gap-4 text-xs lg:text-sm font-medium text-muted-foreground flex-wrap justify-end">
                <a href="/" className="hover:text-white transition-colors duration-200">Dashboard</a>
                <a href="/modules/1-reflection" className="hover:text-white transition-colors duration-200">1. Recon</a>
                <a href="/modules/2-idor" className="hover:text-white transition-colors duration-200">2. IDOR</a>
                <a href="/modules/3-injection" className="hover:text-white transition-colors duration-200">3. Injection</a>
                <a href="/modules/4-auth" className="hover:text-white transition-colors duration-200">4. Auth</a>
                <a href="/modules/5-streaming" className="hover:text-white pl-2 border-l border-white/10 transition-colors duration-200 text-orange-400">5. DoS</a>
                <a href="/modules/6-interceptors" className="hover:text-white transition-colors duration-200 text-pink-400">6. JWT</a>
              </nav>
            </div>
          </header>
          <main className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
