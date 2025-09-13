import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lumidex - Pokemon TCG Collection Manager",
  description: "Manage your Pokemon TCG collection with real-time pricing data from Cardmarket and TCGplayer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}