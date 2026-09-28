// Gera o fluxo "WhatsApp · Responder (manual pelo admin)" do n8n.
// Rodar: node docs/n8n/gerar-workflow-whatsapp-responder.mjs [saida.json]
//
// Só é chamado pelo painel admin → Comunicação → WhatsApp quando uma pessoa
// da equipe escreve a resposta e clica em Enviar (com confirmação). Nada é
// automático. Manda texto, imagem (com legenda) ou arquivo pelo WAHA da
// escola (sessão "amadeus"). Aceita uma conversa existente (chatId) ou, na
// "Nova mensagem", só o telefone — aí confere o número com e sem o 9.
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
const DESTINO =
  "$('Webhook').first().json.body.chatId || ($('Usar sem 9').isExecuted ? $('Usar sem 9').first().json.chatId : $('Usar com 9').first().json.chatId)";
const arquivoJson = `={\n  "mimetype": "{{ ${corpo("arquivo.tipo")} }}",\n  "filename": "{{ ${corpo("arquivo.nome")} }}",\n  "url": "{{ ${corpo("arquivo.url")} }}"\n}`;
const responder = (name, pos, codigo, body) => node(name, "n8n-nodes-base.respondToWebhook", 1.1, pos, { respondWith: "json", responseBody: body, options: { responseCode: codigo } });

const formatar = [
  `let d = String(${corpo("telefone")} || '').replace(/\\D/g, '');`,
  "if (d.startsWith('55') && d.length > 11) d = d.slice(2);",
  "const ddd = d.substring(0, 2);",
  "const num = d.substring(2);",
  "const semNove = (num.length === 9 && num.startsWith('9')) ? num.substring(1) : num;",
  "return [{ json: {",
  "  phoneSemNove: '55' + ddd + semNove, phoneComNove: '55' + ddd + '9' + semNove,",
  "  chatIdSemNove: '55' + ddd + semNove + '@c.us', chatIdComNove: '55' + ddd + '9' + semNove + '@c.us',",
  "} }];",
].join("\n");

const ifExiste = (name, pos, cid) => node(name, "n8n-nodes-base.if", 2.2, pos, {
  conditions: {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
    conditions: [{ id: cid, leftValue: "={{ $json.numberExists }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } }],
    combinator: "and",
  },
  options: {},
});
const setChat = (name, pos, expr) => node(name, "n8n-nodes-base.set", 3.4, pos, { assignments: { assignments: [{ id: name, name: "chatId", value: expr, type: "string" }] }, options: {} });
const enviar = (name, pos, operation, extra) => node(name, "@devlikeapro/n8n-nodes-waha.WAHA", 202502, pos, {
  resource: "Chatting", operation, session: "=amadeus", chatId: `={{ ${DESTINO} }}`, ...extra,
}, { credentials: CRED.waha, onError: "continueRegularOutput" });

const nodes = [
  node("Instruções", "n8n-nodes-base.stickyNote", 1, [-520, -300], {
    content: "## WHATSAPP · RESPONDER (MANUAL PELO ADMIN)\n\nSó dispara quando alguém da equipe escreve no painel (admin → Comunicação → WhatsApp) e clica em Enviar. Nunca é automático.\n\nTexto, imagem ou arquivo pelo WhatsApp da escola. Conversa existente (chatId) ou nova (telefone, conferido com e sem o 9).\n\nGerado por docs/n8n/gerar-workflow-whatsapp-responder.mjs",
    height: 300, width: 440,
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
  node("Tem conversa?", "n8n-nodes-base.if", 2.2, [-60, 120], {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: "tem", leftValue: `={{ ${corpo("chatId")} }}`, rightValue: "", operator: { type: "string", operation: "notEmpty", singleValue: true } }],
      combinator: "and",
    },
    options: {},
  }),
  node("Formatar Telefone", "n8n-nodes-base.code", 2, [-60, 480], { jsCode: formatar }),
  node("Check Sem 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [140, 480], { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $json.phoneSemNove }}" }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe sem 9?", [340, 480], "sem9"),
  setChat("Usar sem 9", [540, 400], "={{ $('Formatar Telefone').first().json.chatIdSemNove }}"),
  node("Check Com 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [540, 580], { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $('Formatar Telefone').first().json.phoneComNove }}" }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe com 9?", [740, 580], "com9"),
  setChat("Usar com 9", [940, 520], "={{ $('Formatar Telefone').first().json.chatIdComNove }}"),
  responder("Sem WhatsApp", [940, 680], 200, "={{ { ok: false, status: 'sem_whatsapp' } }}"),
  node("Tipo", "n8n-nodes-base.switch", 3.2, [160, 100], {
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
  enviar("Enviar texto", [400, -20], "Send Text", { text: `={{ ${corpo("texto")} }}` }),
  enviar("Enviar imagem", [400, 120], "Send Image", { file: arquivoJson, caption: `={{ ${corpo("texto")} || '' }}` }),
  enviar("Enviar arquivo", [400, 260], "Send File", { file: arquivoJson, caption: `={{ ${corpo("texto")} || '' }}` }),
  responder("Resultado", [640, 120], 200, `={{ { ok: !$json.error, chatId: ${DESTINO}, detalhe: $json.error ? JSON.stringify($json.error).slice(0, 300) : '' } }}`),
];
const liga = (de, para, saida = 0) => ({ de, para, saida });
const ligacoes = [
  liga("Webhook", "Chave confere?"), liga("Chave confere?", "Tem conversa?", 0), liga("Chave confere?", "Negar", 1),
  liga("Tem conversa?", "Tipo", 0), liga("Tem conversa?", "Formatar Telefone", 1),
  liga("Formatar Telefone", "Check Sem 9"), liga("Check Sem 9", "Existe sem 9?"),
  liga("Existe sem 9?", "Usar sem 9", 0), liga("Existe sem 9?", "Check Com 9", 1),
  liga("Check Com 9", "Existe com 9?"), liga("Existe com 9?", "Usar com 9", 0), liga("Existe com 9?", "Sem WhatsApp", 1),
  liga("Usar sem 9", "Tipo"), liga("Usar com 9", "Tipo"),
  liga("Tipo", "Enviar texto", 0), liga("Tipo", "Enviar imagem", 1), liga("Tipo", "Enviar arquivo", 2),
  liga("Enviar texto", "Resultado"), liga("Enviar imagem", "Resultado"), liga("Enviar arquivo", "Resultado"),
];
const connections = {};
for (const { de, para, saida } of ligacoes) {
  connections[de] ??= { main: [] };
  while (connections[de].main.length <= saida) connections[de].main.push([]);
  connections[de].main[saida].push({ node: para, type: "main", index: 0 });
}
const nomes = new Set(nodes.map((x) => x.name));
for (const { de, para } of ligacoes) if (!nomes.has(de) || !nomes.has(para)) throw new Error(`ligação inválida ${de} -> ${para}`);
const wf = { name: "WhatsApp · Responder (manual pelo admin)", nodes, connections, settings: { executionOrder: "v1", timezone: "America/Fortaleza" }, pinData: {} };
const saida = process.argv[2] ?? path.join(os.tmpdir(), "workflow-whatsapp-responder.json");
fs.writeFileSync(saida, JSON.stringify(wf));
console.log("ok:", nodes.length, "nós ->", saida);
