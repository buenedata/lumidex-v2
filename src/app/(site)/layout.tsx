import type { Metadata } from "next";
import "../globals.css";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Lumidex v2 - Pokemon TCG Collection Manager",
  description: "Manage your Pokemon TCG collection with real-time pricing data from Cardmarket and TCGplayer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-panel/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-aurora rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gradient">Lumidex</span>
                <span className="text-sm text-muted font-medium">v2</span>
              </div>
            </div>
            <p className="text-sm text-muted max-w-xs">
              The ultimate Pokemon TCG collection manager with real-time pricing data and comprehensive tracking.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text">Quick Links</h3>
            <nav className="space-y-2">
              <a href="/sets" className="block text-sm text-muted hover:text-text transition-colors">
                Browse Sets
              </a>
              <a href="/cards" className="block text-sm text-muted hover:text-text transition-colors">
                Search Cards
              </a>
              <a href="/collection" className="block text-sm text-muted hover:text-text transition-colors">
                My Collection
              </a>
            </nav>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text">Built With</h3>
            <div className="space-y-2 text-sm text-muted">
              <p>Next.js 14 & React 18</p>
              <p>Supabase Database</p>
              <p>Pokemon TCG API v2</p>
              <p>Tailwind CSS & Headless UI</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-xs text-muted">
              © 2024 Lumidex v2. Built for Pokemon TCG collectors.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted">
              <span>Cardmarket & TCGplayer pricing</span>
              <span>•</span>
              <span>Real-time updates</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}