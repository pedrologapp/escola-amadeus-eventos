import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lerLinkDoComprovante } from "@/lib/matricula-avista-link";
import { rotuloForma, type DetalhesAVista } from "@/lib/matricula-avista";
import { SEGMENTO_NOME, naSerie, primeiroNome, reais, segmentoDe } from "@/lib/rematricula-2027";

/**
 * O comprovante da matrícula à vista em PNG (1080 × 1500), para o WhatsApp: o que a família pagou (o ano à vista com 10%, o livro, o
 * desconto a mais), o total e a forma de pagamento. Mesma arte da carta da rematrícula (azul, ouro, creme, Fraunces + DM Sans).
 * Só abre com o link assinado que o admin gera (lib/matricula-avista-link); os valores vêm do banco.
 */

const W = 1080;
const H = 1560;
const AZUL = "#083078";
const TINTA = "#17223D";
const OURO = "#B9862F";
const AMARELO = "#FFB000";
const CINZA = "#5A6478";
const CREME = "#FAF7F0";
const VERDE = "#1F7A4A";

async function fonte(origem: string, arquivo: string) {
  const r = await fetch(new URL(`/fonts/${arquivo}`, origem));
  return r.arrayBuffer();
}

const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const id = lerLinkDoComprovante(searchParams.get("p"), searchParams.get("s"));
  if (!id) return new Response("Link inválido ou vencido.", { status: 404 });
  const { data: c } = await createAdminClient()
    .from("cobrancas_avulsas")
    .select("aluno_nome, responsavel_nome, valor_total, detalhes, tipo, status_pagamento, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.tipo !== "matricula_avista" || !c.detalhes) return new Response("Comprovante não encontrado.", { status: 404 });
  const d = c.detalhes as DetalhesAVista;
  const nome = c.aluno_nome ?? "";
  const seg = segmentoDe(d.serie2027);

  const [r400, r700, r800, f600] = await Promise.all([
    fonte(origin, "DMSans-400.woff"),
    fonte(origin, "DMSans-700.woff"),
    fonte(origin, "DMSans-800.woff"),
    fonte(origin, "Fraunces-600.woff"),
  ]);
  const img = (p: string) => new URL(p, origin).toString();
  const linha = (rotulo: string, valor: string, o: { forte?: boolean; cor?: string; menor?: boolean } = {}) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "2px solid rgba(23,34,61,.10)", fontSize: o.menor ? 26 : 30, fontWeight: o.forte ? 800 : 400, color: o.cor ?? TINTA }}>
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  );

  // uma parcela da conta: o nome, o detalhe embaixo (menor) e o valor com o sinal (+ soma, − desconto)
  const item = (rotulo: string, detalhe: string, valor: string, cor = TINTA) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "2px solid rgba(23,34,61,.10)", color: cor }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 28 }}>{rotulo}</span>
        <span style={{ fontSize: 20, color: CINZA, marginTop: 2 }}>{detalhe}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700 }}>{valor}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", background: CREME, color: TINTA, fontFamily: "DM", padding: "80px 86px 64px" }}>
        <img alt="" src={img("/folder/marca-globo.png")} width={880} height={880} style={{ position: "absolute", right: -240, bottom: -270, opacity: 0.06 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img alt="" src={img("/folder/marca-30-anos.png")} width={140} height={Math.round(140 * 989 / 900)} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 20, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", lineHeight: 1.7 }}>
            <span style={{ color: OURO }}>Comprovante de pagamento</span>
            <span style={{ color: "#9AA3B4" }}>Centro Educacional Amadeus</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
          <span style={{ background: VERDE, color: "#FFFFFF", fontSize: 24, fontWeight: 800, padding: "8px 22px", borderRadius: 99, letterSpacing: 1 }}>PAGO</span>
          <span style={{ marginLeft: 18, fontSize: 24, fontWeight: 700, color: CINZA }}>{`Matrícula 2027 à vista · ${dataBR(d.dataPagamento)}`}</span>
        </div>
        <div style={{ marginTop: 26, fontSize: 22, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: OURO }}>Aluno(a)</div>
        <div style={{ marginTop: 8, fontFamily: "Fraunces", fontSize: 60, lineHeight: 1.05, color: AZUL, letterSpacing: -1 }}>{nome}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 18, fontSize: 24, fontWeight: 700, color: CINZA }}>
          <span style={{ background: AZUL, color: AMARELO, fontWeight: 800, padding: "6px 20px", borderRadius: 99, marginRight: 14 }}>{d.serie2027}</span>
          {seg ? `${SEGMENTO_NOME[seg]} · 2027` : "2027"}
        </div>
        <div style={{ marginTop: 16, fontSize: 26, lineHeight: 1.45, color: CINZA }}>
          {`Recebemos o pagamento do ano de 2027 à vista de ${primeiroNome(nome)} ${naSerie(d.serie2027)}${c.responsavel_nome ? `, feito por ${c.responsavel_nome}` : ""}. Obrigado pela confiança!`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, background: "#FFFFFF", borderRadius: 28, padding: "18px 38px", boxShadow: "0 8px 24px rgba(8,48,120,.08)" }}>
          {/* (Pedro, 29/10: "parece que a mensalidade e tudo é uma soma: o pai tem que entender a conta") a mensalidade é só a referência
              (dentro da linha da anuidade); a conta é: anuidade + livros = subtotal; − descontos à vista = total pago */}
          {item("Anuidade 2027", `matrícula + 11 mensalidades · 12 × ${reais(d.mensalidade)}`, `+ ${reais(d.ano)}`)}
          {d.livro > 0 && item("Livros 2027", `12 parcelas de ${reais(d.livro12x / 12)}`, `+ ${reais(d.livro12x)}`)}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "2px solid rgba(23,34,61,.10)", fontSize: 27, fontWeight: 800, color: TINTA }}>
            <span>Subtotal</span><span>{reais(d.ano + (d.livro > 0 ? d.livro12x : 0))}</span>
          </div>
          {item("Desconto à vista na anuidade", "10%", `− ${reais(d.desconto)}`, VERDE)}
          {d.livro > 0 && item("Desconto à vista nos livros", "10%", `− ${reais(Math.round((d.livro12x - d.livro) * 100) / 100)}`, VERDE)}
          {d.extra > 0 && item("Desconto especial", "concedido pela direção", `− ${reais(d.extra)}`, VERDE)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 22, paddingBottom: 2 }}>
            <span style={{ fontSize: 30, fontWeight: 800 }}>= Total pago</span>
            <span style={{ fontFamily: "Fraunces", fontSize: 64, color: AZUL, letterSpacing: -1 }}>{reais(Number(c.valor_total ?? d.total))}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 6, fontSize: 24, color: CINZA }}>
            {`equivale a ${reais(Math.round(Number(c.valor_total ?? d.total) / 12 * 100) / 100)} por mês${d.livro > 0 ? ", com os livros" : ""}`}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 26, fontSize: 26, color: TINTA }}>
          <span style={{ fontWeight: 800, marginRight: 10 }}>Forma de pagamento:</span>
          <span>{rotuloForma(d, reais)}</span>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 28, borderTop: "2px solid rgba(23,34,61,.16)", fontSize: 20, lineHeight: 1.5, color: "#9AA3B4" }}>
          {`Comprovante emitido pela secretaria do Centro Educacional Amadeus em ${dataBR(c.created_at)}. Guarde esta imagem.`}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "DM", data: r400, weight: 400, style: "normal" },
        { name: "DM", data: r700, weight: 700, style: "normal" },
        { name: "DM", data: r800, weight: 800, style: "normal" },
        { name: "Fraunces", data: f600, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
