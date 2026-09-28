/* eslint-disable @next/next/no-img-element -- Satori desenha <img>, não é página */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { FORMATOS } from "@/lib/cartaz";
import { decodificarCaderno } from "@/lib/cartaz-caderno";

/**
 * Cartaz do evento no estilo "Caderno" dos encartes da Experiência Amadeus.
 * Base de medidas: A4 com 1240 px de largura (escala = W / 1240).
 */

const AZUL = "#083078";
const TINTA = "#1A2240";
const CINZA = "#3B4A6B";

async function fonte(origem: string, arquivo: string) {
  return (await fetch(new URL(`/fonts/${arquivo}`, origem))).arrayBuffer();
}

const cacheFotos = new Map<string, string>();
async function fotoUtilizavel(url: string, largura: number): Promise<string | null> {
  const k = `${largura}|${url}`;
  if (cacheFotos.has(k)) return cacheFotos.get(k)!;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: largura, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const uri = `data:image/jpeg;base64,${jpg.toString("base64")}`;
    if (cacheFotos.size > 30) cacheFotos.clear();
    cacheFotos.set(k, uri);
    return uri;
  } catch {
    return null;
  }
}

/** Folha pautada: linhas azuis, margem vermelha. */
function pauta(W: number, H: number, passo: number, margem: number) {
  let linhas = "";
  for (let y = passo * 2; y < H; y += passo) linhas += `<path d="M0 ${y.toFixed(1)}H${W}" stroke="#DCE5F1" stroke-width="${Math.max(1, passo * 0.03).toFixed(1)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FDFBF6"/>${linhas}<path d="M${margem} 0V${H}" stroke="#E8A9A9" stroke-width="${Math.max(1.5, passo * 0.05).toFixed(1)}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const e = decodificarCaderno(searchParams.get("d") ?? "");
  if (!e || !FORMATOS[e.formato]) return new Response("Cartaz inválido.", { status: 400 });

  const escala = Math.min(1, Math.max(0.3, Number(searchParams.get("escala")) || 1));
  const W = Math.round(FORMATOS[e.formato].w * escala);
  const H = Math.round(FORMATOS[e.formato].h * escala);
  const s = W / 1240;
  const px = (v: number) => Math.round(v * s);
  const quadrado = e.formato === "quadrado";
  const margem = px(120);
  const passo = px(41);

  const [d500, d700, d800, f700, fItal] = await Promise.all([
    fonte(origin, "DMSans-500.woff"),
    fonte(origin, "DMSans-700.woff"),
    fonte(origin, "DMSans-800.woff"),
    fonte(origin, "Fraunces-700.woff"),
    fonte(origin, "Fraunces-500-italic.woff"),
  ]);
  const foto = e.foto ? await fotoUtilizavel(e.foto, px(700)) : null;
  const qr = e.link
    ? await QRCode.toString(`https://${e.link.replace(/^https?:\/\//, "")}`, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: AZUL, light: "#FFFFFF" } })
    : null;
  const img = (p: string) => new URL(p, origin).toString();

  const fita = (cor: "ouro" | "azul", giro = -3, largura = 150) => (
    <div style={{ display: "flex", position: "absolute", top: -px(22), left: "50%", marginLeft: -px(largura / 2), width: px(largura), height: px(44), background: cor === "ouro" ? "rgba(255,192,64,.88)" : "rgba(127,178,230,.88)", transform: `rotate(${giro}deg)` }} />
  );
  const rotulo = (t: string) => (
    <div style={{ display: "flex", alignItems: "center", fontSize: px(20), fontWeight: 800, letterSpacing: px(4), textTransform: "uppercase", color: AZUL }}>
      {t}
      <div style={{ display: "flex", width: px(70), height: px(5), background: "#FFB000", borderRadius: 4, marginLeft: px(18) }} />
    </div>
  );

  const nItens = quadrado ? 3 : e.foto ? 3 : 6;
  const itens = e.itens.filter(Boolean).slice(0, nItens);
  const colunas = itens.length === 4 ? 2 : 3;
  const tamTitulo = px((e.titulo + e.tituloMarca).length > 34 ? 78 : (e.titulo + e.tituloMarca).length > 22 ? 94 : 108);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, position: "relative", fontFamily: "DM", color: TINTA, backgroundImage: `url(${pauta(W, H, passo, margem)})`, backgroundSize: `${W}px ${H}px` }}>
        {/* furos do caderno */}
        {Array.from({ length: Math.floor(H / px(290)) }).map((_, i) => (
          <div key={i} style={{ display: "flex", position: "absolute", left: px(38), top: px(240) + i * px(290), width: px(38), height: px(38), borderRadius: 99, background: "#E9E3D5" }} />
        ))}

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: W, height: H, padding: `${px(70)}px ${px(70)}px ${px(60)}px ${margem + px(52)}px` }}>
          {/* topo: marca e etiqueta */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <img alt="" src={img("/folder/marca-30-anos.png")} width={px(150)} height={px(150 * 989 / 900)} />
            {e.etiqueta && (
              <div style={{ display: "flex", transform: "rotate(3deg)", background: "#FFB000", color: AZUL, fontWeight: 800, fontSize: px(26), letterSpacing: px(5), textTransform: "uppercase", padding: `${px(18)}px ${px(34)}px`, borderRadius: px(8), marginTop: px(40) }}>
                {e.etiqueta}
              </div>
            )}
          </div>

          {/* título e chamada ficam juntos */}
          <div style={{ display: "flex", flexDirection: "column" }}>
          {/* título com grifo amarelo */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: px(24), fontFamily: "Fraunces", fontWeight: 700, fontSize: tamTitulo, lineHeight: 1, letterSpacing: -px(2), color: AZUL }}>
            {e.titulo && <span>{e.titulo}</span>}
            {e.tituloMarca && (
              <div style={{ display: "flex", position: "relative", alignSelf: "flex-start", marginTop: px(6) }}>
                <div style={{ display: "flex", position: "absolute", left: -px(8), right: -px(8), bottom: px(4), height: "44%", background: "#FFD860" }} />
                <span style={{ position: "relative" }}>{e.tituloMarca}</span>
              </div>
            )}
          </div>

          {(e.chamada || e.chamadaForte) && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: px(22), fontSize: px(30), lineHeight: 1.4, color: CINZA, maxWidth: px(900) }}>
              {e.chamada && <span>{e.chamada}</span>}
              {e.chamadaForte && <span style={{ fontWeight: 800, color: AZUL }}>{e.chamadaForte}</span>}
            </div>
          )}

          </div>

          {/* post-its e, embaixo, o público em pílulas (numa linha que quebra) */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: px(24) }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: px(34) }}>
              {e.notas.slice(0, 2).map((n, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: px(300), padding: `${px(34)}px ${px(30)}px ${px(26)}px`, background: i === 0 ? "#FFE58A" : "#CFE3F7", transform: `rotate(${i === 0 ? -2.4 : 1.8}deg)` }}>
                  {fita(i === 0 ? "azul" : "ouro", i === 0 ? -3 : 2)}
                  <span style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: px(n.v.length > 11 ? 42 : 54), color: AZUL, lineHeight: 1 }}>{n.v}</span>
                  {n.r && <span style={{ marginTop: px(12), fontSize: px(21), fontWeight: 800, letterSpacing: px(4), textTransform: "uppercase", color: CINZA }}>{n.r}</span>}
                </div>
              ))}
            </div>
            {e.publico.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: px(12), marginTop: px(34) }}>
                {e.publicoTitulo && <span style={{ fontSize: px(25), color: CINZA, marginRight: px(6) }}>{e.publicoTitulo}</span>}
                {e.publico.slice(0, 4).map((p) => (
                  <span key={p} style={{ display: "flex", fontSize: px(22), fontWeight: 700, padding: `${px(8)}px ${px(22)}px`, borderRadius: 99, background: "#FFFFFF", border: `${Math.max(1, px(3))}px solid ${AZUL}`, color: AZUL }}>{p}</span>
                ))}
              </div>
            )}
          </div>

          {/* foto (polaroid) + itens */}
          {(foto || itens.length > 0) && (
            <div style={{ display: "flex", flexWrap: foto ? "nowrap" : "wrap", alignItems: "flex-start", gap: px(30), marginTop: px(24) }}>
              {foto && (
                <div style={{ display: "flex", flexDirection: "column", position: "relative", background: "#FFFFFF", padding: `${px(16)}px ${px(16)}px 0`, transform: "rotate(-1.5deg)", width: itens.length ? px(470) : px(700) }}>
                  {fita("ouro", -2, 170)}
                  <img alt="" src={foto} width={itens.length ? px(438) : px(668)} height={itens.length ? px(300) : px(440)} style={{ objectFit: "cover" }} />
                  <span style={{ display: "flex", justifyContent: "center", fontFamily: "FrauncesI", fontStyle: "italic", fontSize: px(30), color: AZUL, padding: `${px(16)}px 0 ${px(20)}px` }}>{e.legendaFoto || " "}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: foto ? "column" : "row", flexWrap: "wrap", gap: px(30), flex: 1, paddingTop: foto ? px(10) : 0 }}>
              {itens.map((t, i) => (
                <div key={i} style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", background: "#FFFFFF", width: foto ? px(430) : px(colunas === 2 ? 450 : 300), minHeight: px(110), padding: `${px(30)}px ${px(20)}px ${px(22)}px`, transform: `rotate(${[-1.2, 1, -0.6, 1.4, -1, 0.8][i % 6]}deg)` }}>
                  {fita(i % 2 ? "ouro" : "azul", [-3, 2, -2, 3, -1, 2][i % 6], 120)}
                  <span style={{ display: "flex", textAlign: "center", fontFamily: "FrauncesI", fontStyle: "italic", fontSize: px(t.length > 26 ? 26 : 31), lineHeight: 1.2, color: AZUL }}>{t}</span>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* valores */}
          {e.valores.length > 0 && !quadrado && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: px(24) }}>
              {rotulo("Valores")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: `${px(10)}px ${px(40)}px`, marginTop: px(16) }}>
                {e.valores.slice(0, 4).map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: px(12), fontSize: px(26) }}>
                    <span style={{ color: CINZA }}>{v.rotulo}</span>
                    <span style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: px(34), color: AZUL }}>{v.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* bilhete: onde é + QR */}
          {(e.ondeTitulo || qr) && (
            <div style={{ display: "flex", alignItems: "center", gap: px(40), position: "relative", marginTop: px(30), background: "#FFFFFF", padding: `${px(34)}px ${px(46)}px`, borderRadius: px(10), transform: "rotate(-0.5deg)" }}>
              <div style={{ display: "flex", position: "absolute", top: -px(22), left: px(60), width: px(150), height: px(44), background: "rgba(127,178,230,.88)", transform: "rotate(-3deg)" }} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: px(20), fontWeight: 800, letterSpacing: px(4), textTransform: "uppercase", color: "#B07800" }}>Onde é</span>
                {e.ondeTitulo && <span style={{ marginTop: px(8), fontFamily: "Fraunces", fontWeight: 700, fontSize: px(38), lineHeight: 1.15, color: AZUL }}>{e.ondeTitulo}</span>}
                {e.ondeLinhas.slice(0, 3).map((l, i) => (
                  <span key={i} style={{ marginTop: px(6), fontSize: px(24), lineHeight: 1.4, color: CINZA }}>{l}</span>
                ))}
              </div>
              {qr && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img alt="" src={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`} width={px(170)} height={px(170)} />
                  <span style={{ marginTop: px(12), fontSize: px(20), fontWeight: 800, letterSpacing: px(3), textTransform: "uppercase", color: AZUL }}>{e.qrRotulo || "Inscrição"}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "DM", data: d500, weight: 500, style: "normal" },
        { name: "DM", data: d700, weight: 700, style: "normal" },
        { name: "DM", data: d800, weight: 800, style: "normal" },
        { name: "Fraunces", data: f700, weight: 700, style: "normal" },
        { name: "FrauncesI", data: fItal, weight: 500, style: "italic" },
      ],
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        ...(searchParams.get("baixar") ? { "Content-Disposition": `attachment; filename="cartaz-${e.formato}.png"` } : {}),
      },
    },
  );
}
