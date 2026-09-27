import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { lerLinkDaCarta } from "@/lib/rematricula-2027-link";
import {
  DEPOIS_DO_PRAZO,
  FIDELIDADE,
  PRAZO_PROMOCAO,
  SEGMENTO_NOME,
  URL_FOLDER,
  economiaNoAno,
  livroAVista,
  naSerie,
  primeiroNome,
  reais,
  simular,
  type Condicao,
  type ModoLivro,
} from "@/lib/rematricula-2027";

/**
 * A carta da rematrícula 2027 em PNG (A4 a 150 dpi), para o WhatsApp.
 * Mesma arte da folha impressa (admin/campanhas/rematricula-2027/carta),
 * refeita em flex porque o Satori não faz grid nem texto corrido misto.
 * Só abre com o link assinado que o admin gera (lib/rematricula-2027-link).
 */

const W = 1240;
const H = 1754;
const mm = (v: number) => Math.round(v * 5.905);
const pt = (v: number) => Math.round(v * 2.083);

const AZUL = "#083078";
const TINTA = "#17223D";
const OURO = "#B9862F";
const AMARELO = "#FFB000";
const CINZA = "#5A6478";
const CREME = "#FAF7F0";

async function fonte(origem: string, arquivo: string) {
  const r = await fetch(new URL(`/fonts/${arquivo}`, origem));
  return r.arrayBuffer();
}

function Cartao({ titulo, c, modo, destaque }: { titulo: string; c: Condicao; modo: ModoLivro; destaque?: boolean }) {
  const cor = destaque ? "#FFFFFF" : TINTA;
  const valor = destaque ? AMARELO : AZUL;
  const fio = destaque ? "rgba(255,255,255,.24)" : "rgba(23,34,61,.16)";
  const legenda = { fontSize: pt(8.4), opacity: 0.72, marginTop: 4 } as const;
  return (
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column", borderRadius: mm(6), padding: `${mm(6)}px ${mm(6.5)}px ${mm(5)}px`,
        background: destaque ? AZUL : "rgba(255,255,255,.55)", border: `3px solid ${destaque ? AZUL : "rgba(23,34,61,.16)"}`, color: cor,
      }}
    >
      <div style={{ fontSize: pt(8.4), fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: destaque ? AMARELO : CINZA, marginBottom: mm(3.5) }}>
        {titulo}
      </div>
      <div style={{ fontSize: pt(9.6), fontWeight: 800 }}>Mensalidade Fidelidade</div>
      <div style={{ fontFamily: "Fraunces", fontSize: pt(30), color: valor, marginTop: 4, letterSpacing: -1 }}>{reais(c.mensalidade - FIDELIDADE)}</div>
      <div style={legenda}>pagando até o dia 05 de cada mês</div>
      <div style={{ display: "flex", fontSize: pt(10), marginTop: mm(2.5) }}>
        Mensalidade:&nbsp;<span style={{ fontWeight: 800 }}>{reais(c.mensalidade)}</span>
      </div>
      {modo === "com" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", marginTop: mm(4), paddingTop: mm(3.5), borderTop: `2px solid ${fio}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: pt(10.5) }}>
              <span style={{ fontSize: pt(9.6), fontWeight: 800 }}>Livros</span>
              <span style={{ fontWeight: 800 }}>{`12x ${reais(c.livro)}`}</span>
            </div>
            <div style={legenda}>{`ou ${reais(livroAVista(c.livro))} à vista`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: mm(4), paddingTop: mm(3.5), borderTop: `2px solid ${fio}` }}>
            <div style={{ fontSize: pt(9.6), fontWeight: 800 }}>Total por mês</div>
            <div style={{ fontFamily: "Fraunces", fontSize: pt(20), color: valor, marginTop: 4 }}>{reais(c.fidelidade)}</div>
            <div style={legenda}>mensalidade Fidelidade + livros</div>
            <div style={legenda}>{`após o dia 05: ${reais(c.total)}`}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const d = lerLinkDaCarta(searchParams.get("p"), searchParams.get("s"));
  if (!d) return new Response("Link inválido ou vencido.", { status: 404 });

  const sim = simular(d.serie, d.base);
  const veterano = d.base !== null;
  const primeiro = primeiroNome(d.nome);
  const [r400, r500, r700, r800, f600, qr] = await Promise.all([
    fonte(origin, "DMSans-400.woff"),
    fonte(origin, "DMSans-500.woff"),
    fonte(origin, "DMSans-700.woff"),
    fonte(origin, "DMSans-800.woff"),
    fonte(origin, "Fraunces-600.woff"),
    QRCode.toString(URL_FOLDER, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: TINTA, light: CREME } }),
  ]);
  const img = (p: string) => new URL(p, origin).toString();

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", background: CREME, color: TINTA, fontFamily: "DM", padding: `${mm(14)}px ${mm(16)}px ${mm(12)}px` }}>
        {/* marca d'água e o 2027 ao fundo */}
        <img alt="" src={img("/folder/marca-globo.png")} width={mm(150)} height={mm(150)} style={{ position: "absolute", right: -mm(40), bottom: -mm(46), opacity: 0.07 }} />
        <div style={{ position: "absolute", right: -mm(4), top: mm(30), fontFamily: "Fraunces", fontSize: pt(150), color: OURO, opacity: 0.09, letterSpacing: -12 }}>2027</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img alt="" src={img("/folder/marca-30-anos.png")} width={mm(25)} height={Math.round(mm(25) * 989 / 900)} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: pt(8.4), fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", lineHeight: 1.7 }}>
            <span style={{ color: OURO }}>Matrículas 2027</span>
            <span style={{ color: "#9AA3B4" }}>Centro Educacional Amadeus</span>
          </div>
        </div>

        <div style={{ marginTop: mm(8), fontSize: pt(9), fontWeight: 800, letterSpacing: 4.5, textTransform: "uppercase", color: OURO }}>Para a família de</div>
        <div style={{ marginTop: mm(2), fontFamily: "Fraunces", fontSize: pt(27), lineHeight: 1.05, color: AZUL, letterSpacing: -1, maxWidth: mm(165) }}>{d.nome}</div>
        <div style={{ marginTop: mm(4), fontSize: pt(12), lineHeight: 1.5, color: CINZA, maxWidth: mm(160) }}>
          {`Em 2027, ${primeiro} ${veterano ? "segue com a gente" : "começa com a gente"} ${naSerie(d.serie)}. ${
            veterano ? "Preparamos os valores do ano que vem a partir do que a sua família já investe hoje." : "Preparamos aqui os valores do ano que vem."
          }`}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: mm(4), fontSize: pt(9.5), fontWeight: 700, color: CINZA }}>
          <span style={{ background: AZUL, color: AMARELO, fontWeight: 800, padding: `${mm(1.2)}px ${mm(3.5)}px`, borderRadius: 99, marginRight: mm(2) }}>{d.serie}</span>
          {`${SEGMENTO_NOME[sim.segmento]} · 2027`}
        </div>

        <div style={{ display: "flex", gap: mm(5), marginTop: mm(6), alignItems: "flex-start" }}>
          <Cartao titulo={`Fechando até ${PRAZO_PROMOCAO}`} c={sim.promo} modo={d.modo} destaque />
          <Cartao titulo={`A partir de ${DEPOIS_DO_PRAZO}`} c={sim.depois} modo={d.modo} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", marginTop: mm(5), fontSize: pt(12), lineHeight: 1.45 }}>
          {`Fechando até ${PRAZO_PROMOCAO}, a sua família economiza `}
          <span style={{ color: OURO, fontWeight: 800 }}>{reais(economiaNoAno(sim, d.modo))}</span>
          {" ao longo de 2027."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: mm(4), fontSize: pt(9.6), lineHeight: 1.6, color: CINZA }}>
          <div style={{ display: "flex" }}>
            {"•  "}<span style={{ color: TINTA, fontWeight: 700 }}>Mensalidade Fidelidade:</span>
            {` ${reais(FIDELIDADE)} de desconto em cada mês pago até o dia 05.`}
          </div>
          {d.modo === "com" && (
            <div style={{ display: "flex" }}>
              {"•  "}<span style={{ color: TINTA, fontWeight: 700 }}>Livros:</span>
              {` até ${PRAZO_PROMOCAO}, o livro de 2027 sai pelo preço de 2026. À vista, 10% de desconto.`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: mm(7), marginTop: "auto", paddingTop: mm(4.5), borderTop: "2px solid rgba(23,34,61,.16)" }}>
          <img alt="" src={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`} width={mm(27)} height={mm(27)} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: pt(13.5), fontWeight: 800 }}>Conheça tudo o que vem em 2027</span>
            <span style={{ marginTop: mm(2), fontSize: pt(9.8), lineHeight: 1.42, color: CINZA }}>
              Aponte a câmera do celular para o código e veja o folder digital: as novidades, os projetos e o dia a dia de cada etapa.
            </span>
            <span style={{ marginTop: mm(2.5), fontSize: pt(9.6), fontWeight: 700, color: OURO }}>{URL_FOLDER.replace("https://", "")}</span>
          </div>
        </div>
        <div style={{ marginTop: mm(3.5), fontSize: pt(7.6), color: "#9AA3B4" }}>
          {`Valores preparados para a família de ${d.nome} em ${d.data}. Válidos para a rematrícula de 2027.`}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "DM", data: r400, weight: 400, style: "normal" },
        { name: "DM", data: r500, weight: 500, style: "normal" },
        { name: "DM", data: r700, weight: 700, style: "normal" },
        { name: "DM", data: r800, weight: 800, style: "normal" },
        { name: "Fraunces", data: f600, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
