import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VENUE_NAME } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${VENUE_NAME} · Ordina e salta la fila`,
  description:
    "Ordina i tuoi shot dal telefono, paga con Apple Pay o Google Pay e ritira al bancone mostrando lo scontrino digitale.",
};

export const viewport: Viewport = {
  themeColor: "#08060f",
  // Il pulsante "Consegnato" del barman non deve poter zoomare per sbaglio.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
