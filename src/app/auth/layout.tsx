import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Authentication - Lumidex v2",
  description: "Sign in or create an account to manage your Pokemon TCG collection",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
