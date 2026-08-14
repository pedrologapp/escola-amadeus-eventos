import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  codigoValido,
  ordenarPorTurma,
  urlDoQr,
  type VideoPais,
} from "@/lib/dia-dos-pais";
import { assinarVarios } from "@/lib/dia-dos-pais-storage";
import {
  CardImpresso,
  FORMATOS,
  cssCard,
  dimensoes,
  type Dim,
  type Formato,
} from "@/components/dia-dos-pais/card-impresso";
import { BotaoImprimir } from "./botao-imprimir";

/**
 * Folha de impressão dos cards do Dia dos Pais.
 *
 * Sai 4 cards por folha, cada um com 1/4 dela, pra encaixar na placa de
 * acrílico. Uso: abrir → conferir → Ctrl+P → "Salvar como PDF".
 *
 * NA HORA DE IMPRIMIR: margens "Nenhuma" e DESMARQUE "Ajustar à página".
 * Senão o navegador encolhe ~4% e o card não encaixa na placa.
 */
export const dynamic = "force-dynamic";

const VALIDADE_SEGUNDOS = 60 * 60 * 2;

interface Props {
  searchParams: Promise<{
    serie?: string;
    turma?: string;
    codigos?: string;
    todos?: string;
    formato?: string;
    guias?: string;
  }>;
}

export default async function ImprimirCardsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const formato: Formato =
    sp.formato === "a4" || sp.formato === "legal" ? sp.formato : "oficio";
  const dim = dimensoes(formato);
  const mostrarGuias = sp.guias !== "0";

  // Seleção explícita feita na tela do admin. Quando existe, manda: os
  // filtros de série/turma não se aplicam por cima dela.
  const codigos = (sp.codigos ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => codigoValido(c));

  const admin = createAdminClient();
  let query = admin.from("videos_pais").select("*");

  if (codigos.length > 0) {
    query = query.in("codigo", codigos);
  } else {
    if (sp.serie) query = query.eq("serie", sp.serie);
    if (sp.turma) query = query.eq("turma", sp.turma);
  }

  const { data } = await query;
  // Série, turma e nome — na ordem pedagógica, que é a ordem de entrega
  // das turmas. O banco só ordena série como texto e sairia errado.
  let alunos = ordenarPorTurma((data ?? []) as VideoPais[]);

  // Por padrão só imprime quem já tem vídeo — card com QR que não leva
  // a lugar nenhum é papel jogado fora. ?todos=1 força incluir todos.
  // Numa seleção explícita a escola já decidiu, então respeitamos.
  const semVideo = alunos.filter((a) => !a.video_path).length;
  if (sp.todos !== "1" && codigos.length === 0) {
    alunos = alunos.filter((a) => a.video_path);
  }

  // Uma foto por criança: o principal e cada irmão.
  const fotos = await assinarVarios(
    alunos.flatMap((a) => [
      a.foto_path,
      ...(a.irmaos_dados ?? []).map((i) => i.foto_path),
    ]),
    VALIDADE_SEGUNDOS,
  );

  // QR em SVG (não PNG): vetor imprime nítido em qualquer resolução.
  // Correção "M" aguenta uma dobra ou um respingo sem parar de ler;
  // acima disso o QR fica denso demais pra esse tamanho.
  const qrs = await Promise.all(
    alunos.map((a) =>
      QRCode.toString(urlDoQr(a.codigo), {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 0,
        color: { dark: "#063376", light: "#ffffff" },
      }),
    ),
  );

  // Mesma base que entrou nos QRs acima — mostrada na barra pra conferência.
  const baseDoQr = urlDoQr("").replace(/\/p\/$/, "");
  const destinoSuspeito = /localhost|127\.0\.0\.1|vercel\.app/.test(baseDoQr);

  const folhas: number[][] = [];
  for (let i = 0; i < alunos.length; i += 4) {
    folhas.push(
      Array.from({ length: 4 }, (_, j) => i + j).filter((k) => k < alunos.length),
    );
  }

  return (
    <>
      <style>{cssFolha(dim) + cssCard(dim)}</style>

      <div className="barra-controle">
        <div>
          <strong>{alunos.length}</strong> card
          {alunos.length === 1 ? "" : "s"} · {folhas.length} folha
          {folhas.length === 1 ? "" : "s"}
          {codigos.length > 0 ? " · seleção da tela" : ""}
          {!codigos.length && sp.serie ? ` · ${sp.serie}` : ""}
          {!codigos.length && sp.turma ? ` · Turma ${sp.turma}` : ""}
        </div>

        {/* Card sem vídeo tem QR que não leva a lugar nenhum. Se a escola
            selecionou algum assim, é melhor avisar antes do papel. */}
        {semVideo > 0 && (
          <div className="destino alerta">
            ⚠ {semVideo} sem vídeo
          </div>
        )}

        <div className="seletor">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => {
            const x = dimensoes(f);
            return (
              <a
                key={f}
                href={`?${novaQuery(sp, "formato", f)}`}
                className={formato === f ? "ativo" : ""}
                title={`Papel ${x.rotulo}mm · card ${x.cardW}×${x.cardH}mm`}
              >
                {x.rotulo.split(" ")[0]} · card {x.cardW}×{x.cardH}mm
              </a>
            );
          })}
        </div>

        <div className="dica">
          Papel <strong>{dim.rotulo}mm</strong> · margens{" "}
          <strong>Nenhuma</strong> · desmarque{" "}
          <strong>Ajustar à página</strong>
        </div>

        {/* O QR é impresso e não tem desfazer. Se NEXT_PUBLIC_SITE_URL
            estiver errada no ambiente, 70 cards saem apontando pro lugar
            errado — então a URL fica à vista antes de imprimir. */}
        <div className={`destino ${destinoSuspeito ? "alerta" : ""}`}>
          {destinoSuspeito ? "⚠ QR aponta para " : "QR aponta para "}
          <strong>{baseDoQr}/p/…</strong>
        </div>

        <BotaoImprimir />
      </div>

      {alunos.length === 0 && (
        <div className="vazio">
          Nenhum aluno com vídeo ainda. Suba os vídeos primeiro, ou
          adicione <code>?todos=1</code> na URL pra ver o layout em branco.
        </div>
      )}

      {folhas.map((indices, f) => (
        <div className="folha" key={f}>
          {mostrarGuias && (
            <>
              <div className="guia guia-v" aria-hidden />
              <div className="guia guia-h" aria-hidden />
            </>
          )}

          {indices.map((i) => {
            const a = alunos[i];
            return (
              <CardImpresso
                key={a.id}
                aluno={{ ...a, irmaos: (a.irmaos_dados ?? []).map((x) => x.nome) }}
                fotos={[
                  {
                    url: a.foto_path ? fotos.get(a.foto_path) : undefined,
                    brilho: a.brilho_foto,
                  },
                  ...(a.irmaos_dados ?? []).map((x) => ({
                    url: x.foto_path ? fotos.get(x.foto_path) : undefined,
                    brilho: x.brilho,
                  })),
                ]}
                qrSvg={qrs[i]}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

/** Mantém os filtros atuais ao trocar de formato. */
function novaQuery(
  atual: Record<string, string | undefined>,
  chave: string,
  valor: string,
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(atual)) if (v) p.set(k, v);
  p.set(chave, valor);
  return p.toString();
}

/** Folha, barra de controle e regras de impressão. O card em si mora em
 *  components/dia-dos-pais/card-impresso.tsx. */
export function cssFolha(d: Dim) {
  return `
  @page { size: ${d.papel}; margin: 0; }

  .barra-controle {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    padding: 12px 20px; background: #063376; color: #fff;
    font: 500 14px/1.4 system-ui, sans-serif;
  }
  .barra-controle .dica { font-size: 12px; opacity: .85; }
  .seletor { display: flex; gap: 6px; }
  .seletor a {
    padding: 5px 12px; border-radius: 8px; text-decoration: none;
    background: rgba(255,255,255,.12); color: #fff; font-size: 12px; font-weight: 600;
  }
  .seletor a.ativo { background: #f2b014; color: #063376; }
  .destino {
    font-size: 12px; opacity: .8;
    padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,.1);
  }
  .destino.alerta { background: #b91c1c; opacity: 1; font-weight: 700; }
  .vazio {
    margin: 40px auto; max-width: 520px; padding: 24px;
    border: 2px dashed #d7e0f5; border-radius: 16px;
    text-align: center; color: #555; font: 400 15px/1.5 system-ui, sans-serif;
  }
  .vazio code { background: #eef2fb; padding: 2px 6px; border-radius: 4px; }

  .folha {
    position: relative;
    width: ${d.folhaW}mm; height: ${d.folhaH}mm;
    margin: 16px auto;
    display: grid;
    grid-template-columns: ${d.cardW}mm ${d.cardW}mm;
    grid-template-rows: ${d.cardH}mm ${d.cardH}mm;
    align-content: start; justify-content: start;
    background: #fff;
    box-shadow: 0 2px 16px rgba(0,0,0,.15);
    overflow: hidden;
  }
  .guia { position: absolute; background: rgba(255,255,255,.4); z-index: 2; }
  .guia-v { left: ${d.cardW}mm; top: 0; width: .25mm; height: ${d.cardH * 2}mm; }
  .guia-h { top: ${d.cardH}mm; left: 0; height: .25mm; width: ${d.cardW * 2}mm; }

  @media print {
    .barra-controle, .vazio { display: none !important; }
    .folha {
      margin: 0; box-shadow: none;
      break-after: page; page-break-after: always;
    }
    .folha:last-child { break-after: auto; page-break-after: auto; }
    /* Sem isso o Chrome descarta os fundos e o card sai branco */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
}
