// Gera docs/n8n/workflow-aniversarios.json (fluxo "Aniversários · Alunos e
// Colaboradores"). Rodar: node docs/n8n/gerar-workflow-aniversarios.mjs
//
// Todo dia às 7h (horário de Fortaleza/Natal): busca no Activesoft os alunos
// ativos e os colaboradores que fazem aniversário hoje, manda o cartão
// (imagem de /api/aniversario) pelo WAHA para TODOS os responsáveis do aluno
// (sem repetir número) e para o próprio colaborador, e registra cada envio em
// aniversario_envios para nunca repetir no mesmo dia.
import fs from "node:fs";
import path from "node:path";

const CRED = {
  activesoft: { httpBearerAuth: { id: "O1Shny6h20txi7XS", name: "Bearer Auth account" } },
  supabase: { supabaseApi: { id: "twGMaqD94DHqfjbv", name: "SEA" } },
  waha: { wahaApi: { id: "Wa5n1cK3Gl4WH4bW", name: "WAHA account" } },
};
let n = 0;
const id = () => `a11e0000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const node = (name, type, typeVersion, position, parameters, extra = {}) => ({ parameters, id: id(), name, type, typeVersion, position, ...extra });

const configuracao = `// ================= CONFIGURAÇÃO =================
// modoTeste = true  -> manda SÓ para o telefoneTeste: um cartão de aluno e um de
//                      colaborador com o nomeTeste, como se fosse o aniversário dele.
// modoTeste = false -> manda para os aniversariantes de hoje (alunos e colaboradores).
const modoTeste = true;
const telefoneTeste = '84991335975';
const nomeTeste = 'Pedro Luciano';

const site = 'https://eventos.escolaamadeus.com';

// {nome} vira os dois primeiros nomes da pessoa.
const textoAluno =
\`🎉 Hoje é um dia muito especial: *{nome}* está fazendo aniversário!

Toda a família Amadeus deseja um novo ano cheio de alegria, descobertas e muito aprendizado. 💙

Parabéns! 🎂
_Centro Educacional Amadeus_\`;

const textoColaborador =
\`🎉 Feliz aniversário, *{nome}*!

Obrigado por fazer parte, todos os dias, do que nós somos. Que o seu novo ano seja leve, cheio de saúde e de conquistas. 💙

_Equipe Centro Educacional Amadeus_\`;
// ================================================

const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }); // AAAA-MM-DD
return [{ json: { modoTeste, telefoneTeste, nomeTeste, site, textoAluno, textoColaborador, hoje } }];`;

const montar = `const cfg = $('Configuração').first().json;
const hoje = cfg.hoje;
const mmdd = hoje.slice(5);
const ehBissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
// quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos
const fazHoje = (nasc) => {
  if (!nasc) return false;
  const d = String(nasc).slice(5, 10);
  if (d === mmdd) return true;
  return d === '02-29' && mmdd === '02-28' && !ehBissexto(+hoje.slice(0, 4));
};
const CONECT = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const doisNomes = (bruto) => {
  const cap = (p) => p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1).toLocaleLowerCase('pt-BR');
  const partes = String(bruto || '').trim().split(/\\s+/).filter(Boolean);
  const out = [];
  for (const p of partes) { if (!out.length) { out.push(cap(p)); continue; } if (CONECT.has(p.toLowerCase())) continue; out.push(cap(p)); break; }
  return out.join(' ');
};
const tel = (t) => { let d = String(t || '').replace(/\\D/g, ''); if (d.startsWith('55') && d.length > 11) d = d.slice(2); return d.length >= 10 ? d : null; };
const cartao = (tipo, nomeCompleto) => cfg.site + '/api/aniversario?tipo=' + tipo + '&nome=' + encodeURIComponent(nomeCompleto);
const item = (tipo, pessoaRef, nomeCompleto, telefone) => {
  const nome = doisNomes(nomeCompleto);
  const texto = (tipo === 'aluno' ? cfg.textoAluno : cfg.textoColaborador).replace(/\\{nome\\}/g, nome);
  return { json: { data: hoje, tipo, pessoa_ref: pessoaRef, nome, telefone, imagem: cartao(tipo, nomeCompleto), texto } };
};

// ---- aniversariantes reais de hoje (também calculados no teste, só para o resumo)
const ativos = new Map();
for (const i of $('Alunos Ativos').all()) { const a = i.json; if (a && a.id_aluno && !ativos.has(a.id_aluno)) ativos.set(a.id_aluno, a); }
const cadastro = new Map($('Lista Alunos').all().map(i => [i.json.id, i.json]));
const celResp = new Map($('Responsáveis').all().map(i => [i.json.id, i.json.celular]));
const reais = [];
for (const a of ativos.values()) {
  if (!fazHoje(a.data_nascimento)) continue;
  const c = cadastro.get(a.id_aluno) || {};
  const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...(c.responsaveis_adicionais_ids || [])].filter(Boolean);
  const fones = [...new Set(ids.map(r => tel(celResp.get(r))).filter(Boolean))];
  for (const f of fones) reais.push(item('aluno', 'aluno:' + a.id_aluno, a.nome, f));
}
for (const i of $('Colaboradores').all()) {
  const c = i.json;
  if (!c || c.ativo === false || !fazHoje(c.data_nascimento)) continue;
  const f = tel(c.celular);
  if (f) reais.push(item('colaborador', 'colab:' + c.id, c.nome, f));
}

if (cfg.modoTeste) {
  const t = tel(cfg.telefoneTeste);
  if (!t) throw new Error('Modo teste: telefoneTeste inválido no nó Configuração.');
  const agora = Date.now();
  return [
    item('aluno', 'teste:aluno:' + agora, cfg.nomeTeste, t),
    item('colaborador', 'teste:colab:' + agora, cfg.nomeTeste, t),
  ].map(x => ({ json: { ...x.json, resumoReal: reais.length + ' envio(s) reais seriam feitos hoje (' + hoje + ')' } }));
}

// ---- tira quem já recebeu hoje
const jaFoi = new Set($('Já enviados hoje').all().map(i => i.json && i.json.pessoa_ref ? i.json.pessoa_ref + '|' + i.json.telefone : null).filter(Boolean));
return reais.filter(x => !jaFoi.has(x.json.pessoa_ref + '|' + x.json.telefone));`;

const formatar = `const d = $('Uma por vez').first().json.telefone;
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
const http = (name, pos, caminho) => node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
  url: `https://siga01.activesoft.com.br/api/${caminho}`,
  authentication: "genericCredentialType", genericAuthType: "httpBearerAuth", options: {},
}, { credentials: CRED.activesoft, executeOnce: true });
const registrar = (name, pos, status) => node(name, "n8n-nodes-base.supabase", 1, pos, {
  tableId: "aniversario_envios",
  fieldsUi: { fieldValues: [
    { fieldId: "data", fieldValue: "={{ $('Uma por vez').first().json.data }}" },
    { fieldId: "tipo", fieldValue: "={{ $('Uma por vez').first().json.tipo }}" },
    { fieldId: "pessoa_ref", fieldValue: "={{ $('Uma por vez').first().json.pessoa_ref }}" },
    { fieldId: "nome", fieldValue: "={{ $('Uma por vez').first().json.nome }}" },
    { fieldId: "telefone", fieldValue: "={{ $('Uma por vez').first().json.telefone }}" },
    { fieldId: "status", fieldValue: status },
    { fieldId: "detalhe", fieldValue: "={{ $json.error ? JSON.stringify($json.error).slice(0, 300) : '' }}" },
  ] },
}, { credentials: CRED.supabase, onError: "continueRegularOutput" });

const nodes = [
  node("Instruções", "n8n-nodes-base.stickyNote", 1, [-760, -320], {
    content: "## ANIVERSÁRIOS · ALUNOS E COLABORADORES\n\nTodo dia às 7h busca no Activesoft quem faz aniversário hoje e manda o cartão (imagem gerada em eventos.escolaamadeus.com/api/aniversario):\n- **Aluno:** para TODOS os responsáveis (sem repetir número).\n- **Colaborador:** no privado dele.\nCada envio fica em `aniversario_envios` (Supabase SEA), para nunca repetir no mesmo dia.\n\n**Teste:** com `modoTeste = true` no nó Configuração, manda só para o telefoneTeste um cartão de aluno e um de colaborador.\n**Para valer:** `modoTeste = false` e ativar (Publish) o fluxo.",
    height: 420, width: 520,
  }),
  node("Todo dia às 7h", "n8n-nodes-base.scheduleTrigger", 1.2, [-720, 160], { rule: { interval: [{ triggerAtHour: 7 }] } }),
  node("Executar manualmente", "n8n-nodes-base.manualTrigger", 1, [-720, 340], {}),
  node("Configuração", "n8n-nodes-base.code", 2, [-500, 240], { jsCode: configuracao }),
  http("Alunos Ativos", [-300, 240], "v0/acesso/alunos/"),
  http("Lista Alunos", [-100, 240], "v1/lista_alunos/"),
  http("Responsáveis", [100, 240], "v1/lista_responsaveis/"),
  http("Colaboradores", [300, 240], "v1/lista_colaboradores/"),
  node("Já enviados hoje", "n8n-nodes-base.supabase", 1, [500, 240], {
    operation: "getAll", tableId: "aniversario_envios", returnAll: true, filterType: "manual", matchType: "allFilters",
    filters: { conditions: [{ keyName: "data", condition: "eq", keyValue: "={{ $('Configuração').first().json.hoje }}" }] },
  }, { credentials: CRED.supabase, executeOnce: true, alwaysOutputData: true }),
  node("Montar Aniversariantes", "n8n-nodes-base.code", 2, [700, 240], { jsCode: montar }),
  node("Uma por vez", "n8n-nodes-base.splitInBatches", 3, [900, 240], { options: {} }),
  node("Formatar Telefone", "n8n-nodes-base.code", 2, [1120, 320], { jsCode: formatar }),
  node("Check Sem 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [1320, 320],
    { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $json.phoneSemNove }}" },
    { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe sem 9?", [1520, 320], "sem9"),
  setChat("Usar sem 9", [1740, 220], "={{ $('Formatar Telefone').first().json.chatIdSemNove }}"),
  node("Check Com 9", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [1740, 420],
    { resource: "Contacts", operation: "Check Exists", session: "=amadeus", phone: "={{ $('Formatar Telefone').first().json.phoneComNove }}" },
    { credentials: CRED.waha, onError: "continueRegularOutput" }),
  ifExiste("Existe com 9?", [1940, 420], "com9"),
  setChat("Usar com 9", [2160, 360], "={{ $('Formatar Telefone').first().json.chatIdComNove }}"),
  node("Enviar Cartão", "@devlikeapro/n8n-nodes-waha.WAHA", 202502, [2380, 260], {
    resource: "Chatting", operation: "Send Image", session: "=amadeus", chatId: "={{ $json.chatId }}",
    file: "={\n  \"mimetype\": \"image/png\",\n  \"filename\": \"aniversario.png\",\n  \"url\": \"{{ $('Uma por vez').first().json.imagem }}\"\n}",
    caption: "={{ $('Uma por vez').first().json.texto }}",
  }, { credentials: CRED.waha, onError: "continueRegularOutput" }),
  registrar("Registrar Envio", [2600, 260], "={{ $json.error ? 'erro' : 'enviado' }}"),
  registrar("Registrar Sem WhatsApp", [2380, 520], "sem_whatsapp"),
  node("Esperar 20s", "n8n-nodes-base.wait", 1.1, [2820, 380], { amount: 20, unit: "seconds" }, { webhookId: "a11e0000-0000-4000-8000-0000000000aa" }),
  node("Resumo", "n8n-nodes-base.code", 2, [1120, 80], {
    jsCode: "const itens = $('Montar Aniversariantes').all();\nreturn [{ json: { concluido: true, envios: itens.length, teste: $('Configuração').first().json.modoTeste, resumoReal: itens[0] ? itens[0].json.resumoReal : null } }];",
  }),
];

const liga = (de, para, saida = 0) => ({ de, para, saida });
const ligacoes = [
  liga("Todo dia às 7h", "Configuração"), liga("Executar manualmente", "Configuração"),
  liga("Configuração", "Alunos Ativos"), liga("Alunos Ativos", "Lista Alunos"), liga("Lista Alunos", "Responsáveis"),
  liga("Responsáveis", "Colaboradores"), liga("Colaboradores", "Já enviados hoje"), liga("Já enviados hoje", "Montar Aniversariantes"),
  liga("Montar Aniversariantes", "Uma por vez"), liga("Uma por vez", "Resumo", 0), liga("Uma por vez", "Formatar Telefone", 1),
  liga("Formatar Telefone", "Check Sem 9"), liga("Check Sem 9", "Existe sem 9?"),
  liga("Existe sem 9?", "Usar sem 9", 0), liga("Existe sem 9?", "Check Com 9", 1),
  liga("Check Com 9", "Existe com 9?"), liga("Existe com 9?", "Usar com 9", 0), liga("Existe com 9?", "Registrar Sem WhatsApp", 1),
  liga("Usar sem 9", "Enviar Cartão"), liga("Usar com 9", "Enviar Cartão"),
  liga("Enviar Cartão", "Registrar Envio"), liga("Registrar Envio", "Esperar 20s"), liga("Registrar Sem WhatsApp", "Esperar 20s"),
  liga("Esperar 20s", "Uma por vez"),
];
const connections = {};
for (const { de, para, saida } of ligacoes) {
  connections[de] ??= { main: [] };
  while (connections[de].main.length <= saida) connections[de].main.push([]);
  connections[de].main[saida].push({ node: para, type: "main", index: 0 });
}
const nomes = new Set(nodes.map((x) => x.name));
for (const { de, para } of ligacoes) if (!nomes.has(de) || !nomes.has(para)) throw new Error(`ligação inválida ${de} -> ${para}`);

const wf = { name: "Aniversários · Alunos e Colaboradores", nodes, connections, settings: { executionOrder: "v1", timezone: "America/Fortaleza" }, pinData: {} };
const saida = path.join(import.meta.dirname, "workflow-aniversarios.json");
fs.writeFileSync(saida, JSON.stringify(wf, null, 2) + "\n");
console.log("ok:", nodes.length, "nós ->", saida);
