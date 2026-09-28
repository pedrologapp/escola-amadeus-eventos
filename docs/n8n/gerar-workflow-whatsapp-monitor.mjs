// Gera o fluxo "WhatsApp · Monitoramento (só leitura)" do n8n.
// Rodar: node docs/n8n/gerar-workflow-whatsapp-monitor.mjs [saida.json]
//
// A cada 5 minutos lê as conversas recentes do WhatsApp da escola (WAHA,
// sessão "amadeus", operação "Get Chats Overview") e manda a última mensagem
// de cada conversa individual para o site (/api/whatsapp/monitor), que
// classifica com IA. SÓ LEITURA: este fluxo não tem nenhum nó de envio, e
// não pode ganhar um — a direção não autoriza respostas automáticas.
//
// O JSON sai com a chave do site dentro (x-amadeus-chave), por isso vai para
// fora do repositório e NÃO deve ser commitado.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const raiz = path.join(import.meta.dirname, "..", "..");
const env = fs.readFileSync(path.join(raiz, ".env.local"), "utf8");
const CHAVE = (env.match(/^WEBHOOK_CONFIRM_SECRET=(.*)$/m)?.[1] ?? "").trim().replace(/^"|"$/g, "");
if (!CHAVE) throw new Error("WEBHOOK_CONFIRM_SECRET não está no .env.local");

const CRED = { waha: { wahaApi: { id: "Wa5n1cK3Gl4WH4bW", name: "WAHA account" } } };
let n = 0;
const id = () => `57a70000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const node = (name, type, typeVersion, position, parameters, extra = {}) => ({ parameters, id: id(), name, type, typeVersion, position, ...extra });

// Só conversas individuais (@c.us), da última semana; manda só o necessário.
const montar = `const seteDias = Date.now() / 1000 - 7 * 86400;
const mensagens = [];
for (const i of $input.all()) {
  const c = i.json;
  const m = c && c.lastMessage;
  if (!c || !String(c.id).endsWith('@c.us') || !m || !m.timestamp || m.timestamp < seteDias) continue;
  mensagens.push({
    chatId: c.id,
    nome: c.name || (m._data && m._data.pushName) || null,
    id: m.id,
    ts: m.timestamp,
    fromMe: !!m.fromMe,
    body: m.body || '',
    hasMedia: !!m.hasMedia,
    mimetype: (m.media && m.media.mimetype) || null,
  });
}
return [{ json: { mensagens } }];`;

const nodes = [
  node("Instruções", "n8n-nodes-base.stickyNote", 1, [-420, -260], {
    content: "## WHATSAPP · MONITORAMENTO (SÓ LEITURA)\n\nA cada 5 min lê as conversas recentes do WhatsApp da escola e manda a última mensagem de cada uma para o site classificar (assunto, importância, o que fazer). Painel: admin → Comunicação → WhatsApp.\n\n**Este fluxo NÃO envia nem responde nada** e não deve ganhar nó de envio: a direção não autoriza resposta automática.\n\nGerado por docs/n8n/gerar-workflow-whatsapp-monitor.mjs",
    height: 300, width: 460,
  }),
  node("A cada 5 min", "n8n-nodes-base.scheduleTrigger", 1.2, [-400, 120], { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } }),
  node("Executar manualmente", "n8n-nodes-base.manualTrigger", 1, [-400, 300], {}),
  node("Ler conversas", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [-180, 200],
    { resource: "Chats", operation: "Get Chats Overview", session: "=amadeus", limit: 80 },
    { credentials: CRED.waha }),
  node("Montar lote", "n8n-nodes-base.code", 2, [40, 200], { jsCode: montar }),
  node("Mandar para o site", "n8n-nodes-base.httpRequest", 4.2, [260, 200], {
    method: "POST",
    url: "https://eventos.escolaamadeus.com/api/whatsapp/monitor",
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "x-amadeus-chave", value: CHAVE }] },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json) }}",
    options: { timeout: 240000 },
  }),
];
const connections = {
  "A cada 5 min": { main: [[{ node: "Ler conversas", type: "main", index: 0 }]] },
  "Executar manualmente": { main: [[{ node: "Ler conversas", type: "main", index: 0 }]] },
  "Ler conversas": { main: [[{ node: "Montar lote", type: "main", index: 0 }]] },
  "Montar lote": { main: [[{ node: "Mandar para o site", type: "main", index: 0 }]] },
};
const wf = { name: "WhatsApp · Monitoramento (só leitura)", nodes, connections, settings: { executionOrder: "v1", timezone: "America/Fortaleza", saveDataSuccessExecution: "none" }, pinData: {} };
const saida = process.argv[2] ?? path.join(os.tmpdir(), "workflow-whatsapp-monitor.json");
fs.writeFileSync(saida, JSON.stringify(wf));
console.log("ok:", nodes.length, "nós ->", saida);
