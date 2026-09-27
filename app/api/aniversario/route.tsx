import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { DESENHO_ALUNO, DESENHO_COLABORADOR } from "@/lib/aniversario-desenhos";

/**
 * Cartão de aniversário em PNG (1080x1350), usado pelo fluxo de aniversários
 * do n8n, que envia a imagem pelo WhatsApp.
 *
 *   /api/aniversario?tipo=aluno&nome=Maria Clara Souza de Lima
 *   /api/aniversario?tipo=colaborador&nome=Pedro Luciano ...
 *
 * Recebe o nome completo do Activesoft e usa os dois primeiros nomes,
 * pulando "de", "da", "dos"... Protótipos: docs/aniversario/.
 */

const W = 1080;
const H = 1350;
const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e"]);

function doisNomes(bruto: string): string {
  const partes = bruto.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const cap = (p: string) => p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR");
  const escolhidas: string[] = [];
  for (const p of partes) {
    if (escolhidas.length === 0) { escolhidas.push(cap(p)); continue; }
    if (CONECTORES.has(p.toLowerCase())) continue;
    escolhidas.push(cap(p));
    break;
  }
  return escolhidas.join(" ").slice(0, 32) || "Aniversariante";
}

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/* Pauta do caderno e margem vermelha, desenhadas por SVG: o Satori não
   empilha gradientes repetidos de forma confiável. */
function pauta(w: number, h: number, passo: number, margem: number) {
  let linhas = "";
  for (let y = passo; y < h; y += passo) linhas += `<path d="M0 ${y}H${w}" stroke="#CFDCEE" stroke-width="2"/>`;
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>${linhas}<path d="M${margem} 0V${h}" stroke="rgba(226,110,110,.6)" stroke-width="3"/></svg>`);
}

async function fonte(origem: string, arquivo: string) {
  const r = await fetch(new URL(`/fonts/${arquivo}`, origem));
  return r.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const tipo = searchParams.get("tipo") === "colaborador" ? "colaborador" : "aluno";
  const nome = doisNomes((searchParams.get("nome") ?? "").slice(0, 120));

  const [bold, semi] = await Promise.all([fonte(origin, "Caveat-Bold.ttf"), fonte(origin, "Caveat-SemiBold.ttf")]);
  const logo = new URL("/folder/marca-30-anos.png", origin).toString();

  const topo = (
    <div style={{ position: "absolute", top: 48, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <img src={logo} width={tipo === "aluno" ? 170 : 150} style={{ objectFit: "contain" }} />
      <div style={{ display: "flex", transform: "rotate(4deg)", background: "#FFB000", color: "#083078", fontFamily: "sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: 4, padding: "14px 26px", borderRadius: 8, boxShadow: "0 6px 14px rgba(8,48,120,.18)" }}>
        PARABÉNS!
      </div>
    </div>
  );

  const aluno = (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "linear-gradient(180deg, #FFFDF7 0%, #F6EEDB 100%)" }}>
      {topo}
      <div style={{ position: "absolute", left: 70, top: 290, width: W - 140, height: 990, display: "flex", transform: "rotate(-1.4deg)", boxShadow: "0 14px 34px rgba(26,34,64,.16)" }}>
        <img src={pauta(W - 140, 990, 64, 90)} width={W - 140} height={990} style={{ position: "absolute", left: 0, top: 0 }} />
        <div style={{ position: "absolute", top: -14, left: 110, width: 170, height: 52, background: "rgba(255,192,64,.85)", transform: "rotate(-6deg)" }} />
        <div style={{ position: "absolute", top: -14, right: 120, width: 170, height: 52, background: "rgba(127,178,230,.85)", transform: "rotate(7deg)" }} />
        <div style={{ position: "absolute", left: 130, top: 56, display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: 64, color: "#1D4FA0" }}>Feliz aniversário,</div>
        <div style={{ position: "absolute", left: 130, right: 40, top: 128, display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: 118, color: "#083078", lineHeight: 1.05 }}>
          <span style={{ background: "linear-gradient(180deg, transparent 58%, rgba(255,192,64,.75) 58%, rgba(255,192,64,.75) 90%, transparent 90%)", padding: "0 10px" }}>{nome}</span>!
        </div>
        <div style={{ position: "absolute", left: 130, top: 292, display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: 54, color: "#1D4FA0" }}>Hoje o dia é todo seu!</div>
        <img src={svgUri(DESENHO_ALUNO)} width={800} height={391} style={{ position: "absolute", left: 90, top: 380 }} />
        <div style={{ position: "absolute", right: 90, top: 800, display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: "Caveat", fontWeight: 600, fontSize: 50, lineHeight: 1.25, color: "#1D4FA0" }}>
          <span>Com carinho,</span>
          <span style={{ fontWeight: 700, color: "#083078" }}>Centro Educacional Amadeus 💙</span>
        </div>
      </div>
    </div>
  );

  const giz = "rgba(244,241,232,.95)";
  const colaborador = (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "linear-gradient(180deg, #FFFDF7 0%, #F6EEDB 100%)" }}>
      {topo}
      <div style={{ position: "absolute", left: 56, top: 250, width: W - 112, height: 960, display: "flex", borderRadius: 14, border: "22px solid #C9A46A", boxShadow: "0 18px 40px rgba(26,34,64,.28)", background: "linear-gradient(160deg, #0F3A86 0%, #0A2D6C 55%, #082456 100%)" }}>
        <div style={{ position: "absolute", left: 80, top: 56, display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: 66, color: giz }}>Feliz aniversário,</div>
        <div style={{ position: "absolute", left: 80, right: 40, top: 128, display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: 124, color: "#FFFFFF", lineHeight: 1.02 }}>{nome}!</div>
        <img src={svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="40" viewBox="0 0 600 40"><path d="M6 24C120 10 240 34 360 18S540 22 594 14" fill="none" stroke="#FFD860" stroke-width="5" stroke-linecap="round"/></svg>')} width={600} height={40} style={{ position: "absolute", left: 80, top: 282 }} />
        <div style={{ position: "absolute", left: 80, right: 60, top: 326, display: "flex", flexDirection: "column", fontFamily: "Caveat", fontWeight: 600, fontSize: 52, lineHeight: 1.25, color: "rgba(244,241,232,.88)" }}>
          <span>Obrigado por fazer parte, todos os dias,</span>
          <span style={{ fontWeight: 700, color: "#FFD860" }}>do que nós somos.</span>
        </div>
        <img src={svgUri(DESENHO_COLABORADOR)} width={840} height={308} style={{ position: "absolute", left: 60, top: 460 }} />
        <div style={{ position: "absolute", right: 80, top: 760, display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: "Caveat", fontWeight: 600, fontSize: 50, lineHeight: 1.25, color: giz }}>
          <span>Com carinho,</span>
          <span style={{ fontWeight: 700, color: "#FFD860" }}>Centro Educacional Amadeus 💙</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, right: 110, top: 1204, height: 26, borderRadius: 6, background: "#B08C55" }} />
      <div style={{ position: "absolute", left: 190, top: 1192, width: 64, height: 14, borderRadius: 7, background: "#F4F1E8", transform: "rotate(-4deg)" }} />
      <div style={{ position: "absolute", left: 272, top: 1192, width: 64, height: 14, borderRadius: 7, background: "#FFD860", transform: "rotate(3deg)" }} />
      <div style={{ position: "absolute", right: 190, top: 1176, width: 130, height: 34, borderRadius: 6, background: "#083078", borderTop: "12px solid #D8C9A8" }} />
    </div>
  );

  return new ImageResponse(tipo === "aluno" ? aluno : colaborador, {
    width: W,
    height: H,
    emoji: "twemoji",
    fonts: [
      { name: "Caveat", data: bold, weight: 700, style: "normal" },
      { name: "Caveat", data: semi, weight: 600, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
}
