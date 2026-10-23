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
  // Funções que leem arquivos de public/ com process.cwd() (o quadro do Arboria) faziam a Vercel empacotar a pasta public
  // inteira na função: com o Mundo do Arboria (public/mundo, ~58 MB) passou do limite de 250 MB e o deploy falhava.
  // Nenhuma função do servidor precisa do jogo; o quadro só precisa de public/arboria/quadros.
  outputFileTracingExcludes: {
    "/*": ["public/mundo/**/*"],
    "/admin/arboria-quadro": ["public/!(arboria)/**/*"],
  },
  // Páginas estáticas em public/ com endereço curto (sem o /index.html).
  async rewrites() {
    return [
      { source: "/semanadacrianca", destination: "/semanadacrianca/index.html" },
      // o Mundo do Arboria (jogo 3D, build do Arboria/Mundo/jogo com base /mundo/)
      { source: "/mundo", destination: "/mundo/index.html" },
    ];
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
