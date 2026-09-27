import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * Capa 16:9 da primeira mensagem da rematrícula no WhatsApp (a apresentação
 * da escola). Vai como imagem com o texto na legenda, para o WhatsApp não
 * montar a prévia do link, que ficava feia. Sem dado de aluno: é pública.
 */

const W = 1280;
const H = 720;

async function fonte(origem: string, arquivo: string) {
  const r = await fetch(new URL(`/fonts/${arquivo}`, origem));
  return r.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const { origin } = req.nextUrl;
  const [r500, r800, f600] = await Promise.all([
    fonte(origin, "DMSans-500.woff"),
    fonte(origin, "DMSans-800.woff"),
    fonte(origin, "Fraunces-600.woff"),
  ]);
  const img = (p: string) => new URL(p, origin).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H, display: "flex", position: "relative", overflow: "hidden", fontFamily: "DM",
          background: "linear-gradient(135deg, #0A3A8C 0%, #083078 45%, #061F52 100%)", color: "#FFFFFF",
        }}
      >
        {/* brilho dourado e o globo da marca à direita */}
        <div style={{ position: "absolute", right: -120, top: -80, width: 760, height: 760, borderRadius: 999, background: "radial-gradient(circle, rgba(255,176,0,.28) 0%, rgba(255,176,0,0) 65%)" }} />
        {/* o PNG do globo vem com as laterais cortadas: a moldura redonda esconde */}
        <div
          style={{
            position: "absolute", right: 96, top: 150, width: 420, height: 420, borderRadius: 999, overflow: "hidden",
            border: "12px solid #FFB000", background: "#083078", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,.35)",
          }}
        >
          <img alt="" src={img("/folder/marca-globo.png")} width={430} height={432} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "64px 0 64px 80px", width: 700 }}>
          <img alt="" src={img("/folder/logo-horizontal.png")} width={320} height={80} />
          <div style={{ marginTop: 70, fontSize: 22, fontWeight: 800, letterSpacing: 5, textTransform: "uppercase", color: "#FFB000" }}>
            Matrículas 2027 · Folder digital
          </div>
          <div style={{ marginTop: 14, fontFamily: "Fraunces", fontSize: 88, lineHeight: 1, letterSpacing: -2 }}>O que nós somos!</div>
          <div style={{ marginTop: 26, fontSize: 30, fontWeight: 500, lineHeight: 1.35, color: "rgba(255,255,255,.82)" }}>
            Conheça o Amadeus por dentro: as etapas, o novo material, os projetos, os esportes e os espaços.
          </div>
          <div style={{ display: "flex", marginTop: "auto" }}>
            <div style={{ display: "flex", background: "#FFB000", color: "#083078", fontSize: 24, fontWeight: 800, padding: "14px 26px", borderRadius: 99 }}>
              30 anos · onde cada aluno importa
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "DM", data: r500, weight: 500, style: "normal" },
        { name: "DM", data: r800, weight: 800, style: "normal" },
        { name: "Fraunces", data: f600, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
