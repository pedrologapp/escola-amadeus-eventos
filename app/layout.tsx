import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({ src: [{ path: "../lib/fontes/arquivos/dm-sans-100-1000.woff2", weight: "100 1000", style: "normal" }], variable: "--font-dm-sans", display: "swap" }); // DM Sans, guardada aqui (antes vinha do Google na publicação)

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Centro Educacional Amadeus",
    template: "%s · Escola Amadeus",
  },
  description:
    "Centro Educacional Amadeus — Eventos, inscrições e pagamentos online.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Centro Educacional Amadeus",
    images: ["/logo-amadeus.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
