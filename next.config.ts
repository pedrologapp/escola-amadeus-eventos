import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl
  ? new URL(supabaseUrl).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  experimental: {
    // Folga para o upload da capa do evento (a imagem já é comprimida no
    // navegador antes de enviar, então o normal fica bem abaixo disso).
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Páginas estáticas em public/ com endereço curto (sem o /index.html).
  async rewrites() {
    return [{ source: "/semanadacrianca", destination: "/semanadacrianca/index.html" }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
