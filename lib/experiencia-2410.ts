import "server-only";

/**
 * Experiência Amadeus · reenvio do convite para o sábado 24/10/2026 pela API oficial (YCloud), pedido do Pedro em 23/10.
 * O modelo (template) "experiencia_24_10" tem a imagem do convite no topo e os botões "Eu vou" / "Não vou".
 * O Pedro valida no admin quem recebe (experiencia_contatos.enviar_2410) e ele mesmo aperta o botão de enviar.
 * As respostas chegam pelo webhook da YCloud (lib/whatsapp-auto.ts): "Eu vou" pergunta quantas pessoas vêm e lembra de
 * trazer a criança; o número respondido vai para pessoas_2410.
 */

export const MODELO_2410 = { nome: "experiencia_24_10", idioma: "pt_BR" } as const;
export const IMAGEM_CONVITE = "https://eventos.escolaamadeus.com/materiais/experiencia-convite.png";

export const TEXTO_2410 = {
  vai: "Que alegria! Vamos esperar vocês neste sábado (24/10), às 14h.\n\nQuantas pessoas vêm, contando com a criança? Responda só com o número (por exemplo: 3).\n\nE não esqueçam de trazer seu filho ou sua filha: a Experiência é feita para ele(a) viver um pouco da escola.",
  pessoas: (n: number) => `Anotado: ${n} ${n === 1 ? "pessoa" : "pessoas"}. Até sábado, às 14h!\n\nAv. Benedito Santana, 09, Amarante. Como chegar: https://www.escolaamadeus.com/comochegar`,
  naoVai: "Obrigado por avisar! Quando quiserem conhecer a escola, é só chamar por aqui.",
};

/** Envia o modelo para um número (fora da janela de 24 h só modelo aprovado pode ir). */
export async function enviarConvite2410(telefone: string): Promise<{ ok: boolean; detalhe?: string }> {
  const chave = process.env.YCLOUD_API_KEY;
  const de = process.env.YCLOUD_NUMERO;
  if (!chave || !de) return { ok: false, detalhe: "YCLOUD_API_KEY ou YCLOUD_NUMERO não configurada" };
  try {
    const r = await fetch("https://api.ycloud.com/v2/whatsapp/messages/sendDirectly", {
      method: "POST",
      headers: { "X-API-Key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: de,
        to: "+55" + telefone,
        type: "template",
        template: {
          name: MODELO_2410.nome,
          language: { code: MODELO_2410.idioma },
          components: [{ type: "header", parameters: [{ type: "image", image: { link: IMAGEM_CONVITE } }] }],
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await r.json().catch(() => ({}))) as { status?: string; errorMessage?: string; error?: { message?: string } };
    if (!r.ok || j.status === "failed") return { ok: false, detalhe: j.errorMessage ?? j.error?.message ?? `HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, detalhe: (e as Error).message };
  }
}

const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** O botão (ou a resposta escrita parecida com ele). */
export function respostaBotao2410(texto: string): "vai" | "nao_vai" | null {
  const t = normal(texto);
  if (/^(eu )?nao vou\b|^nao (vamos|poderei|posso)\b/.test(t)) return "nao_vai";
  if (/^(eu )?vou\b|^vamos sim\b|^(eu )?vou sim\b/.test(t)) return "vai";
  return null;
}

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
/** "3", "3 pessoas", "seremos três" → 3 (de 1 a 20). */
export function pessoasDoTexto(texto: string): number | null {
  const t = normal(texto);
  const d = t.match(/\b(\d{1,2})\b/);
  if (d) { const n = Number(d[1]); return n >= 1 && n <= 20 ? n : null; }
  for (const p of t.split(" ")) if (NUMEROS[p]) return NUMEROS[p];
  return null;
}
