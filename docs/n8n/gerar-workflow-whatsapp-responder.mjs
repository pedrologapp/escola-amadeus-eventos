// Gera o fluxo "WhatsApp · Responder (manual pelo admin)" do n8n.
// Rodar: node docs/n8n/gerar-workflow-whatsapp-responder.mjs [saida.json]
//
// Só é chamado pelo painel admin → Comunicação → WhatsApp quando uma pessoa
// da equipe escreve a resposta e clica em Enviar (com confirmação). Nada é
// automático. Manda texto, imagem (com legenda) ou arquivo pelo WAHA da
// escola (sessão "amadeus") para a conversa informada.
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
const id = () => `9e5b0000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const node = (name, type, typeVersion, position, parameters, extra = {}) => ({ parameters, id: id(), name, type, typeVersion, position, ...extra });
const corpo = (c) => `$('Webhook').first().json.body.${c}`;
const arquivoJson = `={\n  "mimetype": "{{ ${corpo("arquivo.tipo")} }}",\n  "filename": "{{ ${corpo("arquivo.nome")} }}",\n  "url": "{{ ${corpo("arquivo.url")} }}"\n}`;
const responder = (name, pos, codigo, body) => node(name, "n8n-nodes-base.respondToWebhook", 1.1, pos, { respondWith: "json", responseBody: body, options: { responseCode: codigo } });
const resultado = "={{ { ok: !$json.error, detalhe: $json.error ? JSON.stringify($json.error).slice(0, 300) : '' } }}";

const nodes = [
  node("Instruções", "n8n-nodes-base.stickyNote", 1, [-520, -300], {
    content: "## WHATSAPP · RESPONDER (MANUAL PELO ADMIN)\n\nSó dispara quando alguém da equipe escreve no painel (admin → Comunicação → WhatsApp) e clica em Enviar. Nunca é automático.\n\nTexto, imagem ou arquivo pelo WhatsApp da escola.\n\nGerado por docs/n8n/gerar-workflow-whatsapp-responder.mjs",
    height: 280, width: 440,
  }),
  node("Webhook", "n8n-nodes-base.webhook", 2, [-500, 120], { httpMethod: "POST", path: "whatsapp-responder", responseMode: "responseNode", options: {} }, { webhookId: "9e5b0000-0000-4000-8000-0000000000aa" }),
  node("Chave confere?", "n8n-nodes-base.if", 2.2, [-280, 120], {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: "chave", leftValue: "={{ $json.headers['x-amadeus-chave'] }}", rightValue: CHAVE, operator: { type: "string", operation: "equals" } }],
      combinator: "and",
    },
    options: {},
  }),
  responder("Negar", [-60, 320], 401, "={{ { ok: false, detalhe: 'chave inválida' } }}"),
  node("Tipo", "n8n-nodes-base.switch", 3.2, [-60, 100], {
    rules: {
      values: ["texto", "imagem", "arquivo"].map((t) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ leftValue: `={{ ${corpo("tipo")} }}`, rightValue: t, operator: { type: "string", operation: "equals" } }],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: t,
      })),
    },
    options: {},
  }),
  node("Enviar texto", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [180, -20], {
    resource: "Chatting", operation: "Send Text", session: "=amadeus", chatId: `={{ ${corpo("chatId")} }}`, text: `={{ ${corpo("texto")} }}`,
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  node("Enviar imagem", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [180, 120], {
    resource: "Chatting", operation: "Send Image", session: "=amadeus", chatId: `={{ ${corpo("chatId")} }}`, file: arquivoJson, caption: `={{ ${corpo("texto")} || '' }}`,
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  node("Enviar arquivo", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [180, 260], {
    resource: "Chatting", operation: "Send File", session: "=amadeus", chatId: `={{ ${corpo("chatId")} }}`, file: arquivoJson, caption: `={{ ${corpo("texto")} || '' }}`,
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  responder("Resultado", [420, 120], 200, resultado),
];
const liga = (de, para, saida = 0) => ({ de, para, saida });
const ligacoes = [
  liga("Webhook", "Chave confere?"), liga("Chave confere?", "Tipo", 0), liga("Chave confere?", "Negar", 1),
  liga("Tipo", "Enviar texto", 0), liga("Tipo", "Enviar imagem", 1), liga("Tipo", "Enviar arquivo", 2),
  liga("Enviar texto", "Resultado"), liga("Enviar imagem", "Resultado"), liga("Enviar arquivo", "Resultado"),
];
const connections = {};
for (const { de, para, saida } of ligacoes) {
  connections[de] ??= { main: [] };
  while (connections[de].main.length <= saida) connections[de].main.push([]);
  connections[de].main[saida].push({ node: para, type: "main", index: 0 });
}
const wf = { name: "WhatsApp · Responder (manual pelo admin)", nodes, connections, settings: { executionOrder: "v1", timezone: "America/Fortaleza" }, pinData: {} };
const saida = process.argv[2] ?? path.join(os.tmpdir(), "workflow-whatsapp-responder.json");
fs.writeFileSync(saida, JSON.stringify(wf));
console.log("ok:", nodes.length, "nós ->", saida);
