// Gera o fluxo "Rematrícula 2027 · Enviar carta" do n8n.
// Rodar: node docs/n8n/gerar-workflow-rematricula.mjs
//
// O admin (Campanhas → Rematrícula 2027) chama o webhook uma vez por número.
// O fluxo confere se o número tem WhatsApp (com e sem o 9), manda pelo WAHA
// da escola (sessão "amadeus"):
//   1) a apresentação da escola com o link do folder digital (com prévia);
//   2) a imagem da carta com os valores (/api/rematricula/carta, link assinado);
// e responde { status: enviado | sem_whatsapp | erro } para o site registrar.
//
// A chave do cabeçalho x-amadeus-chave é a WEBHOOK_CONFIRM_SECRET do site;
// o JSON sai com ela dentro, por isso vai para fora do repositório (argv[2]
// ou a pasta temporária) e NÃO deve ser commitado.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const raiz = path.join(import.meta.dirname, "..", "..");
const env = fs.readFileSync(path.join(raiz, ".env.local"), "utf8");
const CHAVE = (env.match(/^WEBHOOK_CONFIRM_SECRET=(.*)$/m)?.[1] ?? "").trim().replace(/^"|"$/g, "");
if (!CHAVE) throw new Error("WEBHOOK_CONFIRM_SECRET não está no .env.local");

const CRED = { waha: { wahaApi: { id: "Wa5n1cK3Gl4WH4bW", name: "WAHA account" } } };
let n = 0;
const id = () => `4e3a0000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const node = (name, type, typeVersion, position, parameters, extra = {}) => ({ parameters, id: id(), name, type, typeVersion, position, ...extra });
const corpo = (campo) => `$('Webhook').first().json.body.${campo}`;

const formatar = `let d = String(${corpo("telefone")} || '').replace(/\\D/g, '');
if (d.startsWith('55') && d.length > 11) d = d.slice(2);
let ddd, num;
if (d.length <= 9) { ddd = '84'; num = d; } else { ddd = d.substring(0, 2); num = d.substring(2); }
const semNove = (num.length === 9 && num.startsWith('9')) ? num.substring(1) : num;
return [{ json: {
  phoneSemNove: \`55\${ddd}\${semNove}\`, phoneComNove: \`55\${ddd}9\${semNove}\`,
  chatIdSemNove: \`55\${ddd}\${semNove}@c.us\`, chatIdComNove: \`55\${ddd}9\${semNove}@c.us\`,
} }];`;

const ifExiste = (name, pos, cid) => node(name, "n8n-nodes-base.if", 2.2, pos, {
  conditions: {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
    conditions: [{ id: cid, leftValue: "={{ $json.numberExists }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } }],
    combinator: "and",
  },
  options: {},
});
const setChat = (name, pos, expr) => node(name, "n8n-nodes-base.set", 3.4, pos, {
  assignments: { assignments: [{ id: name, name: "chatId", value: expr, type: "string" }] }, options: {},
});
const responder = (name, pos, codigo, corpoJson) => node(name, "n8n-nodes-base.respondToWebhook", 1.1, pos, {
  respondWith: "json", responseBody: corpoJson, options: { responseCode: codigo },
});

const nodes = [
  node("Instruções", "n8n-nodes-base.stickyNote", 1, [-560, -300], {
    content: "## REMATRÍCULA 2027 · ENVIAR CARTA\n\nChamado pelo admin (Campanhas → Rematrícula 2027 → Enviar pelo WhatsApp), um número por vez.\n\n1. Confere a chave do cabeçalho.\n2. Acha o número no WhatsApp (sem e com o 9).\n3. Manda a apresentação da escola com o link do folder.\n4. Manda a imagem da carta com os valores.\n5. Responde o resultado; o site registra em `rematricula_envios`.\n\nGerado por docs/n8n/gerar-workflow-rematricula.mjs",
    height: 360, width: 460,
  }),
  node("Webhook", "n8n-nodes-base.webhook", 2, [-520, 160], {
    httpMethod: "POST", path: "rematricula-carta", responseMode: "responseNode", options: {},
  }, { webhookId: "4e3a0000-0000-4000-8000-0000000000aa" }),
  node("Chave confere?", "n8n-nodes-base.if", 2.2, [-300, 160], {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: "chave", leftValue: "={{ $json.headers['x-amadeus-chave'] }}", rightValue: CHAVE, operator: { type: "string", operation: "equals" } }],
      combinator: "and",
    },
    options: {},
  }),
  responder("Negar", [-80, 360], 401, "={{ { ok: false, status: 'erro', detalhe: 'chave inválida' } }}"),
  node("Formatar Telefone", "n8n-nodes-base.code", 2, [-80, 120], { jsCode: formatar }),
  node("Check Sem 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [140, 120],
    { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $json.phoneSemNove }}" },
    { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe sem 9?", [360, 120], "sem9"),
  setChat("Usar sem 9", [580, 20], "={{ $('Formatar Telefone').first().json.chatIdSemNove }}"),
  node("Check Com 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [580, 240],
    { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $('Formatar Telefone').first().json.phoneComNove }}" },
    { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe com 9?", [800, 240], "com9"),
  setChat("Usar com 9", [1020, 180], "={{ $('Formatar Telefone').first().json.chatIdComNove }}"),
  responder("Sem WhatsApp", [1020, 380], 200, "={{ { ok: false, status: 'sem_whatsapp' } }}"),
  node("Enviar Apresentação", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [1240, 80], {
    resource: "Chatting", operation: "Send Text", session: "=amadeus", chatId: "={{ $json.chatId }}",
    text: `={{ ${corpo("texto")} }}`, linkPreview: true,
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  node("Esperar 4s", "n8n-nodes-base.wait", 1.1, [1460, 80], { amount: 4, unit: "seconds" }, { webhookId: "4e3a0000-0000-4000-8000-0000000000ab" }),
  node("Enviar Carta", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [1680, 80], {
    resource: "Chatting", operation: "Send Image", session: "=amadeus",
    chatId: "={{ $('Usar sem 9').isExecuted ? $('Usar sem 9').first().json.chatId : $('Usar com 9').first().json.chatId }}",
    file: `={\n  "mimetype": "image/png",\n  "filename": "valores-2027.png",\n  "url": "{{ ${corpo("imagem")} }}"\n}`,
    caption: `={{ ${corpo("legenda")} || '' }}`,
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  responder("Resultado", [1900, 80], 200,
    "={{ (() => { const a = $('Enviar Apresentação').first().json; const c = $json; const erro = a.error || c.error; return { ok: !erro, status: erro ? 'erro' : 'enviado', detalhe: erro ? JSON.stringify(erro).slice(0, 300) : '' }; })() }}"),
];

const liga = (de, para, saida = 0) => ({ de, para, saida });
const ligacoes = [
  liga("Webhook", "Chave confere?"),
  liga("Chave confere?", "Formatar Telefone", 0), liga("Chave confere?", "Negar", 1),
  liga("Formatar Telefone", "Check Sem 9"), liga("Check Sem 9", "Existe sem 9?"),
  liga("Existe sem 9?", "Usar sem 9", 0), liga("Existe sem 9?", "Check Com 9", 1),
  liga("Check Com 9", "Existe com 9?"), liga("Existe com 9?", "Usar com 9", 0), liga("Existe com 9?", "Sem WhatsApp", 1),
  liga("Usar sem 9", "Enviar Apresentação"), liga("Usar com 9", "Enviar Apresentação"),
  liga("Enviar Apresentação", "Esperar 4s"), liga("Esperar 4s", "Enviar Carta"), liga("Enviar Carta", "Resultado"),
];
const connections = {};
for (const { de, para, saida } of ligacoes) {
  connections[de] ??= { main: [] };
  while (connections[de].main.length <= saida) connections[de].main.push([]);
  connections[de].main[saida].push({ node: para, type: "main", index: 0 });
}
const nomes = new Set(nodes.map((x) => x.name));
for (const { de, para } of ligacoes) if (!nomes.has(de) || !nomes.has(para)) throw new Error(`ligação inválida ${de} -> ${para}`);

const wf = { name: "Rematrícula 2027 · Enviar carta", nodes, connections, settings: { executionOrder: "v1", timezone: "America/Fortaleza" }, pinData: {} };
const saida = process.argv[2] ?? path.join(os.tmpdir(), "workflow-rematricula.json");
fs.writeFileSync(saida, JSON.stringify(wf, null, 2) + "\n");
console.log("ok:", nodes.length, "nós ->", saida);
