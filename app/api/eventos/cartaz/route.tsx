import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { ESTILOS, FORMATOS, decodificar, type EspecCartaz } from "@/lib/cartaz";

/**
 * Desenha o cartaz de um evento (PNG) a partir da especificação na URL
 * (?d=...). Mesma identidade dos flyers da escola: azul #083078, dourado
 * #FFB000, creme #FAF7F0, Fraunces nos títulos e DM Sans no texto.
 * ?baixar=1 devolve como anexo.
 */

async function fonte(origem: string, arquivo: string) {
  const r = await fetch(new URL(`/fonts/${arquivo}`, origem));
  return r.arrayBuffer();
}

/**
 * Baixa a foto e entrega como data URI em JPEG/PNG. As fotos dos eventos às
 * vezes são WebP e vêm do Storage como "octet-stream" — o desenhador não lê
 * nenhum dos dois, então convertemos com sharp.
 */
async function fotoUtilizavel(url: string, largura: number): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(buf).rotate().resize({ width: largura, withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

function tamanhoTitulo(t: string, s: number) {
  const n = t.length;
  return Math.round((n <= 16 ? 128 : n <= 26 ? 108 : n <= 40 ? 88 : 72) * s);
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const e = decodificar(searchParams.get("d") ?? "");
  if (!e || !FORMATOS[e.formato] || !ESTILOS[e.estilo]) return new Response("Cartaz inválido.", { status: 400 });

  const { w: W, h: H } = FORMATOS[e.formato];
  const s = W / 1080;
  const P = Math.round(72 * s);
  const fotoSrc = e.foto && e.layout !== "sem-foto" ? await fotoUtilizavel(e.foto, W) : null;
  const temFoto = !!fotoSrc;
  const layout = !temFoto ? "sem-foto" : e.layout === "foto-lado" && e.formato === "story" ? "foto-topo" : e.layout;
  const fundoEscuro = layout === "foto-fundo" || e.estilo === "noite";
  const pal = layout === "foto-fundo"
    ? { ...ESTILOS.noite, destaque: e.estilo === "creme" ? "#FFB000" : ESTILOS[e.estilo].destaque === "#083078" ? "#FFB000" : ESTILOS[e.estilo].destaque }
    : ESTILOS[e.estilo];
  const detalhado = e.detalhe === "detalhado";

  const [r500, r700, r800, f600] = await Promise.all([
    fonte(origin, "DMSans-500.woff"),
    fonte(origin, "DMSans-700.woff"),
    fonte(origin, "DMSans-800.woff"),
    fonte(origin, "Fraunces-600.woff"),
  ]);
  const qr = detalhado && e.link
    ? await QRCode.toString(`https://${e.link.replace(/^https?:\/\//, "")}`, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#17223D", light: "#FFFFFF" } })
    : null;
  const img = (p: string) => new URL(p, origin).toString();

  const logo = e.estilo === "dourado" && !fundoEscuro
    ? <img alt="" src={img("/folder/marca-globo.png")} width={Math.round(110 * s)} height={Math.round(110 * s * 402 / 400)} />
    : fundoEscuro
    ? <img alt="" src={img("/folder/logo-horizontal.png")} width={Math.round(300 * s)} height={Math.round(300 * s * 398 / 1600)} />
    : <img alt="" src={img("/folder/marca-30-anos.png")} width={Math.round(118 * s)} height={Math.round(118 * s * 989 / 900)} />;

  const conteudoEm = (s: number) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, color: pal.texto, justifyContent: layout === "foto-fundo" ? "flex-end" : "flex-start" }}>
      <div style={{ fontSize: Math.round(24 * s), fontWeight: 800, letterSpacing: Math.round(5 * s), textTransform: "uppercase", color: pal.destaque }}>
        Evento · Centro Educacional Amadeus
      </div>
      <div style={{ marginTop: Math.round(18 * s), fontFamily: "Fraunces", fontSize: tamanhoTitulo(e.titulo, s), lineHeight: 1.02, letterSpacing: -2 * s, color: pal.titulo }}>
        {e.titulo}
      </div>
      {e.chamada && (
        <div style={{ marginTop: Math.round(22 * s), fontSize: Math.round(38 * s), fontWeight: 500, lineHeight: 1.3, color: pal.suave }}>{e.chamada}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", marginTop: Math.round(36 * s), gap: Math.round(10 * s) }}>
        <div style={{ display: "flex", alignSelf: "flex-start", background: pal.destaque, color: pal.destaque === "#FFB000" ? "#083078" : "#FFFFFF", fontSize: Math.round(36 * s), fontWeight: 800, padding: `${Math.round(12 * s)}px ${Math.round(26 * s)}px`, borderRadius: 999 }}>
          {e.hora ? `${e.data} · ${e.hora}` : e.data}
        </div>
        {e.local && <div style={{ fontSize: Math.round(32 * s), fontWeight: 700, marginTop: Math.round(8 * s) }}>{e.local}</div>}
      </div>

      {detalhado && e.destaques.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: Math.round(28 * s), gap: Math.round(8 * s) }}>
          {e.destaques.slice(0, 4).map((d, i) => (
            <div key={i} style={{ display: "flex", fontSize: Math.round(30 * s), fontWeight: 500, color: pal.suave }}>
              <div style={{ display: "flex", width: Math.round(14 * s), height: Math.round(14 * s), borderRadius: 99, background: pal.destaque, marginTop: Math.round(14 * s), marginRight: Math.round(16 * s), flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{d}</span>
            </div>
          ))}
        </div>
      )}

      {detalhado && (e.preco || qr) && (
        <div style={{ display: "flex", alignItems: "center", gap: Math.round(26 * s), marginTop: Math.round(34 * s) }}>
          {qr && (
            <div style={{ display: "flex", background: "#FFFFFF", borderRadius: Math.round(16 * s), padding: Math.round(8 * s) }}>
              <img alt="" src={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`} width={Math.round(150 * s)} height={Math.round(150 * s)} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {e.preco && <span style={{ fontSize: Math.round(36 * s), fontWeight: 800, color: pal.titulo }}>{e.preco}</span>}
            {e.link && <span style={{ fontSize: Math.round(24 * s), fontWeight: 600, color: pal.suave, marginTop: Math.round(8 * s) }}>Inscrições pelo QR code ou em</span>}
            {e.link && <span style={{ fontSize: Math.round(24 * s), fontWeight: 700, color: pal.destaque, wordBreak: "break-all" }}>{e.link}</span>}
          </div>
        </div>
      )}
    </div>
  );
  const conteudo = conteudoEm(layout === "foto-lado" ? s * 0.66 : s);

  const foto = temFoto ? (
    <img alt="" src={fotoSrc!} width={W} height={H} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${e.foco}` }} />
  ) : null;

  let corpo: React.ReactNode;
  if (layout === "foto-fundo") {
    corpo = (
      <div style={{ display: "flex", width: W, height: H, position: "relative", background: "#083078" }}>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: H }}>{foto}</div>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: H, background: "linear-gradient(180deg, rgba(6,20,52,.35) 0%, rgba(6,20,52,.15) 30%, rgba(6,31,82,.88) 62%, rgba(6,31,82,.97) 100%)" }} />
        <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: W, height: H, padding: P }}>
          <div style={{ display: "flex" }}>{logo}</div>
          {conteudo}
        </div>
      </div>
    );
  } else if (layout === "foto-topo") {
    corpo = (
      <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: pal.fundo }}>
        <div style={{ display: "flex", height: Math.round(H * (e.formato === "story" ? 0.42 : 0.44)), overflow: "hidden" }}>{foto}</div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${Math.round(P * 0.8)}px ${P}px ${P}px` }}>
          {conteudo}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>{logo}</div>
        </div>
      </div>
    );
  } else if (layout === "foto-lado") {
    corpo = (
      <div style={{ display: "flex", width: W, height: H, background: pal.fundo }}>
        <div style={{ display: "flex", width: Math.round(W * 0.44), height: H, overflow: "hidden" }}>{foto}</div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: P }}>
          <div style={{ display: "flex", marginBottom: Math.round(40 * s) }}>{logo}</div>
          {conteudo}
        </div>
      </div>
    );
  } else {
    const dia = (e.data.match(/\d{1,2}/) ?? [""])[0];
    corpo = (
      <div style={{ display: "flex", flexDirection: "column", width: W, height: H, position: "relative", background: pal.fundo, padding: P, overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", right: -Math.round(40 * s), top: Math.round(120 * s), fontFamily: "Fraunces", fontSize: Math.round(620 * s), color: pal.destaque, opacity: 0.14, lineHeight: 1 }}>{dia}</div>
        <div style={{ display: "flex", marginBottom: Math.round(80 * s) }}>{logo}</div>
        {conteudo}
      </div>
    );
  }

  return new ImageResponse(<div style={{ display: "flex", width: W, height: H, fontFamily: "DM" }}>{corpo}</div>, {
    width: W,
    height: H,
    fonts: [
      { name: "DM", data: r500, weight: 500, style: "normal" },
      { name: "DM", data: r700, weight: 700, style: "normal" },
      { name: "DM", data: r800, weight: 800, style: "normal" },
      { name: "Fraunces", data: f600, weight: 600, style: "normal" },
    ],
    headers: {
      "Cache-Control": "public, max-age=3600",
      ...(searchParams.get("baixar") ? { "Content-Disposition": `attachment; filename="cartaz-${e.formato}.png"` } : {}),
    },
  });
}
