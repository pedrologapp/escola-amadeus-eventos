import "server-only";

/**
 * Aviso interno no grupo "Amadeus - Direção" (WhatsApp da escola). ÚNICO
 * envio automático do monitoramento, autorizado pela direção em 28/09/2026:
 * só para mensagens sérias/urgentes e para avisar que já foram respondidas
 * (para ninguém responder por cima). Nunca manda nada para pais.
 */

export const GRUPO_DIRECAO = "120363412798001506@g.us"; // "Amadeus - Direção"
const WEBHOOK = "https://n8n.escolaamadeus.com/webhook/whatsapp-responder";
export const LINK_PAINEL = "https://admin.eventos.escolaamadeus.com/comunicacao/whatsapp";

// DESLIGADO a pedido do Pedro (29/09/2026): nenhum aviso vai para o grupo da direção
// (nem "mensagem importante", nem "já respondida"). O painel continua marcando tudo normalmente.
// Para religar, trocar para true.
const AVISOS_LIGADOS = false;

export async function avisarDirecao(texto: string): Promise<boolean> {
  if (!AVISOS_LIGADOS) return false;
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return false;
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({ chatId: GRUPO_DIRECAO, telefone: "", texto, tipo: "texto", arquivo: null }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean };
    return r.ok && !!j.ok;
  } catch {
    return false;
  }
}

const tz = { timeZone: "America/Fortaleza" } as const;
export const quandoLegivel = (iso: string) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { ...tz, weekday: "long" });
  const data = d.toLocaleDateString("pt-BR", { ...tz, day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { ...tz, hour: "2-digit", minute: "2-digit" });
  return `${dia}, ${data} às ${hora}`;
};

export const telLegivel = (t: string | null | undefined) => {
  const d = String(t ?? "").replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : String(t ?? "");
};
