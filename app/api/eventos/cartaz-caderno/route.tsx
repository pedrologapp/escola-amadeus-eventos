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

  // ---------- quanto cabe: estima a altura do conteúdo e encolhe tudo (k) se passar da página ----------
  const fotoNoTitulo = !!foto && e.fotoPos === "titulo";
  const fotoPolaroid = !!foto && !fotoNoTitulo;
  const obs = (e.observacoes ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 8);
  const valores = quadrado ? [] : e.valores.filter((v) => v.rotulo || v.valor).slice(0, 4);
  const nItens = fotoPolaroid ? 3 : quadrado ? 4 : 6;
  const itens = e.itens.map((t) => t.trim()).filter(Boolean).slice(0, nItens);
  const colunas = itens.length === 4 || itens.length === 2 ? 2 : 3;

  const larguraUtil = 1240 - 120 - 52 - 70; // base A4
  const tamTitulo0 = (e.titulo + e.tituloMarca).length > 34 ? 78 : (e.titulo + e.tituloMarca).length > 22 ? 94 : 108;
  const larguraTitulo = fotoNoTitulo ? larguraUtil - 440 : larguraUtil;
  const linhasDe = (t: string, fonte: number, larg: number) => (t ? Math.max(1, Math.ceil((t.length * fonte * 0.56) / larg)) : 0);
  const altTitulo =
    (linhasDe(e.titulo, tamTitulo0, larguraTitulo) + linhasDe(e.tituloMarca, tamTitulo0, larguraTitulo)) * tamTitulo0 * 1.02 +
    ((e.chamada || e.chamadaForte) ? 22 + (linhasDe(e.chamada, 30, Math.min(900, larguraTitulo)) + linhasDe(e.chamadaForte, 30, Math.min(900, larguraTitulo))) * 42 : 0);
  const blocos: number[] = [
    165, // logo
    Math.max(altTitulo, fotoNoTitulo ? 400 : 0) + 24,
    e.notas.length ? 170 : 0,
    e.publico.length ? 90 : 0,
    itens.length || fotoPolaroid
      ? 56 + (fotoPolaroid ? Math.max(400, itens.length * 140) : Math.ceil(itens.length / colunas) * 145)
      : 0,
    valores.length || obs.length
      ? Math.max(valores.length ? 60 + Math.ceil(valores.length / (obs.length ? 1 : 2)) * 50 : 0, obs.length ? 110 + Math.ceil(obs.length / (valores.length ? 1 : 2)) * 44 : 0) + 30
      : 0,
    e.ondeTitulo || qr ? (qr ? 290 : 190) : 0,
  ];
  const alturaBase = H / s;
  const total = 130 + blocos.reduce((a, b) => a + b, 0) + blocos.filter(Boolean).length * 18;
  const k = Math.max(0.62, Math.min(1, (alturaBase * 0.96) / total));
  const q = (v: number) => Math.round(v * s * k);
  const tamTitulo = q(tamTitulo0);

  const fita = (cor: "ouro" | "azul", giro = -3, largura = 150) => (
    <div style={{ display: "flex", position: "absolute", top: -q(22), left: "50%", marginLeft: -q(largura / 2), width: q(largura), height: q(44), background: cor === "ouro" ? "rgba(255,192,64,.88)" : "rgba(127,178,230,.88)", transform: `rotate(${giro}deg)` }} />
  );
  const rotulo = (t: string) => (
    <div style={{ display: "flex", alignItems: "center", fontSize: q(20), fontWeight: 800, letterSpacing: q(4), textTransform: "uppercase", color: AZUL }}>
      {t}
      <div style={{ display: "flex", width: q(70), height: q(5), background: "#FFB000", borderRadius: 4, marginLeft: q(18) }} />
    </div>
  );

  const blocoValores = valores.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {rotulo("Valores")}
      <div style={{ display: "flex", flexDirection: obs.length ? "column" : "row", flexWrap: "wrap", gap: `${q(10)}px ${q(40)}px`, marginTop: q(16) }}>
        {valores.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: q(12), fontSize: q(26) }}>
            <span style={{ color: CINZA }}>{v.rotulo}</span>
            <span style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: q(34), color: AZUL }}>{v.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // "Não esqueça": bilhete amarelo com caixinhas de marcar (garrafinha, lanche, protetor...).
  const blocoObs = obs.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", flex: valores.length ? 1.3 : 1, background: "#FFF3B8", padding: `${q(34)}px ${q(34)}px ${q(26)}px`, transform: "rotate(0.6deg)" }}>
      {fita("azul", -2, 140)}
      <span style={{ fontSize: q(20), fontWeight: 800, letterSpacing: q(4), textTransform: "uppercase", color: "#8A5A00" }}>{e.observacoesTitulo || "Não esqueça"}</span>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: q(12), gap: `${q(8)}px ${q(26)}px` }}>
        {obs.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: q(12), width: valores.length || obs.length < 4 ? "100%" : "46%", fontSize: q(25), lineHeight: 1.3, color: TINTA }}>
            <div style={{ display: "flex", flexShrink: 0, width: q(24), height: q(24), marginTop: q(4), borderRadius: q(5), border: `${Math.max(1, q(3))}px solid ${AZUL}`, background: "#FFFFFF" }} />
            <span>{o}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, position: "relative", fontFamily: "DM", color: TINTA, backgroundImage: `url(${pauta(W, H, passo, margem)})`, backgroundSize: `${W}px ${H}px` }}>
        {/* furos do caderno */}
        {Array.from({ length: Math.floor(H / px(290)) }).map((_, i) => (
          <div key={i} style={{ display: "flex", position: "absolute", left: px(38), top: px(240) + i * px(290), width: px(38), height: px(38), borderRadius: 99, background: "#E9E3D5" }} />
        ))}

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: W, height: H, padding: `${px(70 * Math.min(1, k + 0.15))}px ${px(70)}px ${px(60 * Math.min(1, k + 0.15))}px ${margem + px(52)}px` }}>
          {/* topo: marca e etiqueta */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <img alt="" src={img("/folder/marca-30-anos.png")} width={q(150)} height={q((150 * 989) / 900)} />
            {e.etiqueta && (
              <div style={{ display: "flex", transform: "rotate(3deg)", background: "#FFB000", color: AZUL, fontWeight: 800, fontSize: q(26), letterSpacing: q(5), textTransform: "uppercase", padding: `${q(18)}px ${q(34)}px`, borderRadius: q(8), marginTop: q(30) }}>
                {e.etiqueta}
              </div>
            )}
          </div>

          {/* título e chamada (e a foto ao lado, se escolhida) */}
          <div style={{ display: "flex", alignItems: "center", gap: q(40) }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", fontFamily: "Fraunces", fontWeight: 700, fontSize: tamTitulo, lineHeight: 1, letterSpacing: -q(2), color: AZUL }}>
                {e.titulo && <span>{e.titulo}</span>}
                {e.tituloMarca && (
                  <div style={{ display: "flex", position: "relative", alignSelf: "flex-start", marginTop: q(6) }}>
                    <div style={{ display: "flex", position: "absolute", left: -q(8), right: -q(8), bottom: q(4), height: "44%", background: "#FFD860" }} />
                    <span style={{ position: "relative" }}>{e.tituloMarca}</span>
                  </div>
                )}
              </div>
              {(e.chamada || e.chamadaForte) && (
                <div style={{ display: "flex", flexDirection: "column", marginTop: q(22), fontSize: q(30), lineHeight: 1.4, color: CINZA, maxWidth: q(900) }}>
                  {e.chamada && <span>{e.chamada}</span>}
                  {e.chamadaForte && <span style={{ fontWeight: 800, color: AZUL }}>{e.chamadaForte}</span>}
                </div>
              )}
            </div>
            {fotoNoTitulo && foto && (
              <div style={{ display: "flex", flexDirection: "column", position: "relative", flexShrink: 0, background: "#FFFFFF", padding: q(14), paddingBottom: e.legendaFoto ? 0 : q(14), transform: "rotate(2.5deg)", boxShadow: "0 6px 18px rgba(8,48,120,.12)" }}>
                {fita("ouro", 3, 150)}
                <img alt="" src={foto} width={q(380)} height={q(e.legendaFoto ? 300 : 360)} style={{ objectFit: "cover" }} />
                {e.legendaFoto && (
                  <span style={{ display: "flex", justifyContent: "center", fontFamily: "FrauncesI", fontStyle: "italic", fontSize: q(26), color: AZUL, padding: `${q(12)}px 0 ${q(14)}px`, maxWidth: q(380) }}>{e.legendaFoto}</span>
                )}
              </div>
            )}
          </div>

          {/* post-its e o público em pílulas */}
          {(e.notas.length > 0 || e.publico.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {e.notas.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: q(34), marginTop: q(10) }}>
                  {e.notas.slice(0, 2).map((n, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: q(300), padding: `${q(34)}px ${q(30)}px ${q(26)}px`, background: i === 0 ? "#FFE58A" : "#CFE3F7", transform: `rotate(${i === 0 ? -2.4 : 1.8}deg)` }}>
                      {fita(i === 0 ? "azul" : "ouro", i === 0 ? -3 : 2)}
                      <span style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: q(n.v.length > 11 ? 42 : 54), color: AZUL, lineHeight: 1 }}>{n.v}</span>
                      {n.r && <span style={{ marginTop: q(12), fontSize: q(21), fontWeight: 800, letterSpacing: q(4), textTransform: "uppercase", color: CINZA }}>{n.r}</span>}
                    </div>
                  ))}
                </div>
              )}
              {e.publico.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: q(12), marginTop: q(30) }}>
                  {e.publicoTitulo && <span style={{ fontSize: q(25), color: CINZA, marginRight: q(6) }}>{e.publicoTitulo}</span>}
                  {e.publico.slice(0, 4).map((p) => (
                    <span key={p} style={{ display: "flex", fontSize: q(22), fontWeight: 700, padding: `${q(8)}px ${q(22)}px`, borderRadius: 99, background: "#FFFFFF", border: `${Math.max(1, q(3))}px solid ${AZUL}`, color: AZUL }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* o que está incluso (cartões) + foto polaroid */}
          {(fotoPolaroid || itens.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: q(24) }}>
              {itens.length > 0 && e.itensTitulo !== "" && rotulo(e.itensTitulo || "O que está incluso")}
              <div style={{ display: "flex", alignItems: "flex-start", gap: q(30), marginTop: q(30) }}>
                {fotoPolaroid && foto && (
                  <div style={{ display: "flex", flexDirection: "column", position: "relative", background: "#FFFFFF", padding: `${q(16)}px ${q(16)}px 0`, transform: "rotate(-1.5deg)", width: itens.length ? q(470) : q(700) }}>
                    {fita("ouro", -2, 170)}
                    <img alt="" src={foto} width={itens.length ? q(438) : q(668)} height={itens.length ? q(300) : q(440)} style={{ objectFit: "cover" }} />
                    <span style={{ display: "flex", justifyContent: "center", fontFamily: "FrauncesI", fontStyle: "italic", fontSize: q(28), color: AZUL, padding: `${q(14)}px 0 ${q(18)}px` }}>{e.legendaFoto || " "}</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: fotoPolaroid ? "column" : "row", flexWrap: "wrap", rowGap: q(26), columnGap: px(30), flex: 1, paddingTop: fotoPolaroid ? q(10) : 0 }}>
                  {itens.map((t, i) => (
                    <div key={i} style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", background: "#FFFFFF", width: fotoPolaroid ? q(430) : px(colunas === 2 ? (larguraUtil - 30) / 2 - 4 : (larguraUtil - 60) / 3 - 4), minHeight: q(104), padding: `${q(28)}px ${q(18)}px ${q(20)}px`, transform: `rotate(${[-1.2, 1, -0.6, 1.4, -1, 0.8][i % 6]}deg)` }}>
                      {fita(i % 2 ? "ouro" : "azul", [-3, 2, -2, 3, -1, 2][i % 6], 120)}
                      <span style={{ display: "flex", textAlign: "center", fontFamily: "FrauncesI", fontStyle: "italic", fontSize: q(t.length > 26 ? 26 : 31), lineHeight: 1.2, color: AZUL }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* valores e "não esqueça", lado a lado quando há os dois */}
          {(blocoValores || blocoObs) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: q(40), marginTop: q(10) }}>
              {blocoValores}
              {blocoObs}
            </div>
          )}

          {/* bilhete: onde é + QR */}
          {(e.ondeTitulo || qr) && (
            <div style={{ display: "flex", alignItems: "center", gap: q(40), position: "relative", marginTop: q(20), background: "#FFFFFF", padding: `${q(32)}px ${q(46)}px`, borderRadius: q(10), transform: "rotate(-0.5deg)" }}>
              <div style={{ display: "flex", position: "absolute", top: -q(22), left: q(60), width: q(150), height: q(44), background: "rgba(127,178,230,.88)", transform: "rotate(-3deg)" }} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: q(20), fontWeight: 800, letterSpacing: q(4), textTransform: "uppercase", color: "#B07800" }}>Onde é</span>
                {e.ondeTitulo && <span style={{ marginTop: q(8), fontFamily: "Fraunces", fontWeight: 700, fontSize: q(38), lineHeight: 1.15, color: AZUL }}>{e.ondeTitulo}</span>}
                {e.ondeLinhas.slice(0, 3).map((l, i) => (
                  <span key={i} style={{ marginTop: q(6), fontSize: q(24), lineHeight: 1.4, color: CINZA }}>{l}</span>
                ))}
              </div>
              {qr && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img alt="" src={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`} width={q(170)} height={q(170)} />
                  <span style={{ marginTop: q(12), fontSize: q(20), fontWeight: 800, letterSpacing: q(3), textTransform: "uppercase", color: AZUL }}>{e.qrRotulo || "Inscrição"}</span>
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
