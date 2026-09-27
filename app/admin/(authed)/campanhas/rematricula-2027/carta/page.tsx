import QRCode from "qrcode";
import { Fraunces } from "next/font/google";
import { listarAlunos } from "@/lib/rematricula-2027-dados";
import {
  DEPOIS_DO_PRAZO,
  FIDELIDADE,
  PRAZO_PROMOCAO,
  SERIES,
  URL_FOLDER,
  economiaNoAno,
  livroAVista,
  modoLivroValido,
  naSerie,
  primeiroNome,
  reais,
  simular,
  type Condicao,
  type ModoLivro,
  type NomeSerie,
} from "@/lib/rematricula-2027";
import { BotaoImprimir } from "./botao-imprimir";

/**
 * Carta da rematrícula 2027 para a família, em A4. Sai do simulador com
 * ?aluno=<id>&base=<mensalidade sem livro>&serie=<série 2027>, ou
 * ?nome=<nome>&serie=... para novato. Na hora de imprimir: margens "Nenhuma".
 */
export const metadata = { title: "Carta 2027 · Admin Amadeus" };
export const dynamic = "force-dynamic";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["600"], display: "swap" });

const SEGMENTO_NOME = { maternal: "Educação Infantil", grupo: "Educação Infantil", ef1: "Ensino Fundamental I", ef2: "Ensino Fundamental II" };

function Cartao({ titulo, c, modo, destaque }: { titulo: string; c: Condicao; modo: ModoLivro; destaque?: boolean }) {
  const soMensalidade = c.mensalidade - FIDELIDADE;
  return (
    <div className={`cartao ${destaque ? "destaque" : ""}`}>
      <p className="rotulo">{titulo}</p>
      <div className="linha"><span>Mensalidade</span><b>{reais(c.mensalidade)}</b></div>
      <div className="linha"><span>Mensalidade Fidelidade</span><span>{reais(soMensalidade)}</span></div>
      {modo !== "sem" && (
        <div className="linha livro">
          <span>Livros · 12 parcelas</span>
          <span>{reais(c.livro)}<small>ou {reais(livroAVista(c.livro))} à vista</small></span>
        </div>
      )}
      <div className="total">
        <span className="por-mes">por mês, pagando até o dia 05</span>
        {modo === "sem" ? (
          <span className={`valor ${fraunces.className}`}>{reais(soMensalidade)}</span>
        ) : (
          <>
            <span className={`valor ${fraunces.className}`}>{reais(c.fidelidade)}</span>
            <span className="legenda-valor">com os livros</span>
          </>
        )}
        {modo === "ambos" && (
          <span className="sem-livro"><b className={fraunces.className}>{reais(soMensalidade)}</b> só a mensalidade</span>
        )}
      </div>
      <p className="fidelidade">
        Após o dia 05:{" "}
        {modo === "sem" ? <b>{reais(c.mensalidade)}</b>
          : modo === "com" ? <b>{reais(c.total)}</b>
          : <><b>{reais(c.total)}</b> com livros · <b>{reais(c.mensalidade)}</b> sem</>}
      </p>
    </div>
  );
}

export default async function CartaPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string; base?: string; serie?: string; nome?: string; livro?: string }>;
}) {
  const sp = await searchParams;
  const modo = modoLivroValido(sp.livro);
  const serie = SERIES.find((s) => s.nome === sp.serie)?.nome as NomeSerie | undefined;
  const base = sp.base ? Number(sp.base) : null;
  let nome = sp.nome?.trim() ?? "";
  if (sp.aluno && /^\d+$/.test(sp.aluno)) {
    const alunos = await listarAlunos().catch(() => []);
    nome = alunos.find((a) => a.id === Number(sp.aluno))?.nome ?? nome;
  }
  const veterano = sp.aluno != null && base != null && Number.isFinite(base) && base > 0;

  if (!serie || !nome || (sp.aluno && !veterano)) {
    return <p className="p-10 text-center text-sm text-muted-foreground">Faltam dados para a carta. Volte ao simulador e clique em “Imprimir carta”.</p>;
  }

  const sim = simular(serie, veterano ? base : null);
  const primeiro = primeiroNome(nome);
  const qr = await QRCode.toString(URL_FOLDER, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#17223D", light: "#FAF7F0" },
  });
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{CSS}</style>

      <div className="barra-controle">
        <span>Carta de <b>{nome}</b> · {serie} 2027</span>
        <span className="dica">Papel A4 · margens <b>Nenhuma</b> · marque <b>Gráficos de plano de fundo</b></span>
        <BotaoImprimir />
      </div>

      <div className="folha">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="agua" src="/folder/marca-globo.png" alt="" />
        <span className={`ano-fundo ${fraunces.className}`} aria-hidden>2027</span>

        <header className="topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" />
          <p className="selo">Matrículas 2027<span>Centro Educacional Amadeus</span></p>
        </header>

        <p className="olho">Para a família de</p>
        <h1 className={fraunces.className}>{nome}</h1>
        <p className="abertura">
          Em 2027, {primeiro} {veterano ? "segue com a gente" : "começa com a gente"} <b>{naSerie(serie)}</b>.{" "}
          {veterano
            ? "Preparamos os valores do ano que vem a partir do que a sua família já investe hoje."
            : "Preparamos aqui os valores do ano que vem."}
        </p>
        <p className="serie">
          <span>{serie}</span> {SEGMENTO_NOME[sim.segmento]} · 2027
        </p>

        <div className="cartoes">
          <Cartao titulo={`Fechando até ${PRAZO_PROMOCAO}`} c={sim.promo} modo={modo} destaque />
          <Cartao titulo={`A partir de ${DEPOIS_DO_PRAZO}`} c={sim.depois} modo={modo} />
        </div>

        <p className="economia">
          Fechando até {PRAZO_PROMOCAO}, a sua família economiza <b>{reais(economiaNoAno(sim, modo))}</b> ao longo de 2027.
        </p>

        <ul className="notas">
          <li><b>Mensalidade Fidelidade:</b> {reais(FIDELIDADE)} de desconto em cada mês pago até o dia 05.</li>
          {modo !== "sem" && (
            <li><b>Livros:</b> até {PRAZO_PROMOCAO}, o livro de 2027 sai pelo preço de 2026. À vista, 10% de desconto.</li>
          )}
        </ul>

        <div className="qr-bloco">
          <span className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <span>
            <span className="titulo">Conheça tudo o que vem em 2027</span>
            <span className="texto">Aponte a câmera do celular para o código e veja o folder digital: as novidades, os projetos e o dia a dia de cada etapa.</span>
            <span className="url">{URL_FOLDER.replace("https://", "")}</span>
          </span>
        </div>

        <p className="rodape">Valores preparados para a família de {nome} em {hoje}. Válidos para a rematrícula de 2027.</p>
      </div>
    </>
  );
}

const CSS = `
@page { size: A4; margin: 0; }
.barra-controle {
  position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 20px; background: #083078; color: #fff; font: 500 14px/1.4 system-ui, sans-serif;
}
.barra-controle .dica { font-size: 12px; opacity: .85; }
.botao-imprimir {
  margin-left: auto; padding: 8px 18px; border-radius: 10px; border: none; cursor: pointer;
  background: #FFB000; color: #083078; font: 700 14px system-ui, sans-serif;
}
.folha {
  position: relative; overflow: hidden; width: 210mm; height: 297mm; margin: 20px auto;
  padding: 14mm 16mm 12mm; display: flex; flex-direction: column;
  background: #FAF7F0; color: #17223D; box-shadow: 0 2px 18px rgba(0,0,0,.15);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.folha > *:not(.agua):not(.ano-fundo) { position: relative; z-index: 1; }
.agua { position: absolute; right: -40mm; bottom: -46mm; width: 150mm; opacity: .07; z-index: 0; }
.ano-fundo {
  position: absolute; right: -4mm; top: 30mm; z-index: 0; font-size: 150pt; line-height: 1;
  letter-spacing: -.04em; color: #B9862F; opacity: .09;
}
.topo { display: flex; align-items: center; justify-content: space-between; }
.topo .logo { width: 25mm; height: auto; }
.topo .selo { text-align: right; font-size: 8.4pt; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #B9862F; line-height: 1.7; }
.topo .selo span { display: block; color: #9AA3B4; }
.olho { margin-top: 8mm; font-size: 9pt; font-weight: 800; letter-spacing: .24em; text-transform: uppercase; color: #B9862F; }
.folha h1 { margin-top: 2mm; font-size: 27pt; line-height: 1.05; letter-spacing: -.02em; color: #083078; max-width: 165mm; }
.abertura { margin-top: 4mm; font-size: 12pt; line-height: 1.5; color: #5A6478; max-width: 160mm; }
.abertura b { color: #17223D; }
.serie { margin-top: 4mm; font-size: 9.5pt; font-weight: 700; color: #5A6478; }
.serie span {
  display: inline-block; margin-right: 2mm; padding: 1.2mm 3.5mm; border-radius: 99px;
  background: #083078; color: #FFB000; font-weight: 800;
}
.cartoes { margin-top: 6mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.cartao { border-radius: 6mm; padding: 6mm 6.5mm 5mm; border: .4mm solid rgba(23,34,61,.16); background: rgba(255,255,255,.55); }
.cartao.destaque { background: #083078; color: #fff; border-color: #083078; }
.cartao .rotulo { font-size: 8.4pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #5A6478; margin-bottom: 3.5mm; }
.cartao.destaque .rotulo { color: #FFB000; }
.cartao .linha { display: flex; justify-content: space-between; font-size: 10.5pt; padding: 1.4mm 0; }
.cartao .linha b { font-weight: 800; }
.cartao .linha.livro > span:last-child { text-align: right; }
.cartao .linha small { display: block; font-size: 8pt; opacity: .72; }
.cartao .legenda-valor { font-size: 8.6pt; opacity: .75; margin-top: .5mm; }
.cartao .sem-livro { margin-top: 2.5mm; font-size: 9.4pt; }
.cartao .sem-livro b { font-size: 15pt; font-weight: 600; margin-right: 1mm; }
.cartao .total { margin-top: 3mm; padding-top: 4mm; border-top: .3mm solid rgba(23,34,61,.16); display: flex; flex-direction: column; }
.cartao.destaque .total { border-color: rgba(255,255,255,.22); }
.cartao .por-mes { font-size: 9pt; opacity: .75; }
.cartao .valor { font-size: 27pt; line-height: 1.1; letter-spacing: -.02em; }
.cartao .fidelidade {
  margin-top: 4mm; display: inline-block; padding: 2mm 3.5mm; border-radius: 3mm; font-size: 9.4pt;
  background: rgba(8,48,120,.07); color: #083078;
}
.cartao.destaque .fidelidade { background: rgba(255,176,0,.16); color: #FFB000; }
.economia { margin-top: 5mm; font-size: 12pt; line-height: 1.45; color: #17223D; }
.economia b { color: #B9862F; font-weight: 800; }
.notas { margin-top: 4mm; padding-left: 4.5mm; font-size: 9.6pt; line-height: 1.6; color: #5A6478; }
.notas b { color: #17223D; }
.qr-bloco { margin-top: auto; display: flex; align-items: center; gap: 7mm; padding-top: 4.5mm; border-top: .4mm solid rgba(23,34,61,.16); }
.qr-bloco .qr { width: 27mm; height: 27mm; flex: 0 0 auto; }
.qr-bloco .qr svg { width: 100%; height: 100%; display: block; }
.qr-bloco > span:last-child { flex: 1; }
.qr-bloco .titulo { display: block; font-size: 13.5pt; font-weight: 800; line-height: 1.2; }
.qr-bloco .texto { display: block; margin-top: 2mm; font-size: 9.8pt; line-height: 1.42; color: #5A6478; }
.qr-bloco .url { display: block; margin-top: 2.5mm; font-size: 9.6pt; font-weight: 700; color: #B9862F; }
.rodape { margin-top: 3.5mm; font-size: 7.6pt; color: #9AA3B4; }
@media print {
  .barra-controle { display: none; }
  .folha { margin: 0; box-shadow: none; }
  body { background: #FAF7F0; }
}
`;
