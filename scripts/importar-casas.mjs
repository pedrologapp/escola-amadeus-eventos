// Lê docs/Arboria_As_Casas_29ago2026.pdf e grava a casa de cada aluno
// na coluna `alunos.casa` (migration 0028).
//
// Uso: node scripts/importar-casas.mjs [--dry]
// Precisa de pdfjs-dist:  npm i -D pdfjs-dist
//
// O PDF vem de ferramenta de design: o texto sai "espaçado"
// (A L U N O S, 6 º A N O), nomes longos quebram em duas linhas e o rodapé
// se mistura ao conteúdo. Por isso o parser é manual e, no fim, confere o
// que leu contra os totais impressos no próprio PDF — se divergir, aborta
// em vez de gravar dado torto.

import { readFileSync } from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const RAIZ = process.cwd();
const PDF = path.join(RAIZ, "docs", "Arboria_As_Casas_29ago2026.pdf");

// ---------- credenciais ----------
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const g = (k) =>
  (env.split("\n").find((l) => l.startsWith(k + "=")) || "").slice(k.length + 1).trim();
const SB_URL = g("NEXT_PUBLIC_SUPABASE_URL");
const SB_KEY = g("SUPABASE_SERVICE_ROLE_KEY");
if (!SB_URL || !SB_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}
const sb = async (p, init = {}) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${p} → HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

/** Sem acento, sem caixa, só letras e espaço. */
const chave = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Grafias que divergem entre o PDF e o ERP. Cada linha é uma decisão
// humana — o casamento automático não deve adivinhar isso sozinho.
const APELIDOS = new Map([
  ["felipe ronald", "phillipe ronald silva de carvalho"],
]);

// Remanejamentos combinados DEPOIS do PDF de 29/08. Ficam aqui para que
// reimportar o PDF não desfaça a mudança — o PDF é a foto de um dia, estas
// linhas são o que veio depois.
const REMANEJADOS = new Map([
  // Pedro, 2026-09-04: sai da Linguística, entra na Espacial.
  ["adryan samuel da silva dantas", "Espacial"],
]);

// ---------- 1. PDF -> linhas ----------
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const tarefaPdf = pdfjs.getDocument({
  data: new Uint8Array(readFileSync(PDF)),
  useSystemFonts: true,
});
const doc = await tarefaPdf.promise;

const linhas = [];
for (let i = 1; i <= doc.numPages; i++) {
  const { items } = await (await doc.getPage(i)).getTextContent();
  let ultimoY = null;
  let linha = "";
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    if (ultimoY !== null && Math.abs(y - ultimoY) > 3) {
      linhas.push(linha);
      linha = "";
    }
    linha += it.str;
    ultimoY = y;
  }
  linhas.push(linha);
}
// Solta o pdfjs agora: ele mantém worker/handles abertos e, se ainda
// estiver vivo num process.exit(), o Node no Windows aborta com
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
await tarefaPdf.destroy();

// ---------- 2. linhas -> registros ----------
const RE_CASA = /^Casa\s+(.+?)\s+A\s+L\s+U\s+N\s+O\s+S$/;
const RE_TURMA = /^(\d)\s*º\s*A\s*N\s*O\s+([A-C])\s+(\d+)$/;
const RE_ALUNO = /^(\d+)\.\s*(.*)$/;
const RE_CHROME =
  /Documento interno|Ordenado por Casa|Centro Educacional Amadeus|^Arboria$|^As Casas|^\d+ de \d+$/i;

const registros = [];
const totalImpresso = {};
const turmasImpressas = [];
let casa = null;
let serie = null;
let turma = null;
let atual = null;

function fecharAluno() {
  if (!atual) return;
  const nome = atual.nome.replace(/\s+/g, " ").trim();
  if (nome) registros.push({ casa, serie, turma, nome });
  atual = null;
}

for (const bruta of linhas) {
  const l = bruta.replace(/\s+/g, " ").trim();
  if (!l) continue;
  if (RE_CHROME.test(l)) {
    fecharAluno();
    continue;
  }

  const mCasa = l.match(RE_CASA);
  if (mCasa) {
    fecharAluno();
    let miolo = mCasa[1];
    const mTotal = miolo.match(/\s([\d ]+)$/);
    const total = mTotal ? Number(mTotal[1].replace(/ /g, "")) : null;
    if (mTotal) miolo = miolo.slice(0, mTotal.index);
    casa = miolo.split(/\s+(?:Mentor|Professor)\s+/)[0].trim();
    totalImpresso[casa] = total;
    serie = turma = null;
    continue;
  }

  const mTurma = l.match(RE_TURMA);
  if (mTurma) {
    fecharAluno();
    serie = `${mTurma[1]}º Ano`;
    turma = mTurma[2];
    turmasImpressas.push({ casa, serie, turma, esperado: Number(mTurma[3]) });
    continue;
  }

  const mAluno = l.match(RE_ALUNO);
  if (mAluno && casa && serie) {
    fecharAluno();
    atual = { nome: mAluno[2] };
    continue;
  }
  if (atual) atual.nome += " " + l; // nome que quebrou de linha
}
fecharAluno();

// ---------- 3. o que li bate com o que o PDF diz? ----------
const lidoPorCasa = {};
for (const r of registros) lidoPorCasa[r.casa] = (lidoPorCasa[r.casa] || 0) + 1;

const divergencias = [];
for (const [c, esperado] of Object.entries(totalImpresso)) {
  if ((lidoPorCasa[c] || 0) !== esperado)
    divergencias.push(`casa ${c}: li ${lidoPorCasa[c] || 0}, PDF diz ${esperado}`);
}
for (const t of turmasImpressas) {
  const lido = registros.filter(
    (r) => r.casa === t.casa && r.serie === t.serie && r.turma === t.turma,
  ).length;
  if (lido !== t.esperado)
    divergencias.push(`${t.casa} · ${t.serie} ${t.turma}: li ${lido}, PDF diz ${t.esperado}`);
}
if (divergencias.length) {
  console.error("O PDF não conferiu — nada foi gravado:");
  divergencias.forEach((d) => console.error("  " + d));
  process.exit(1);
}
console.log(
  `PDF lido: ${registros.length} alunos em ${Object.keys(lidoPorCasa).length} casas (bate com os totais impressos).`,
);

// ---------- 4. casa cada aluno com a base ----------
const alunos = await sb("alunos?select=id,nome_completo,serie,turma,casa");
const porNome = new Map();
for (const a of alunos) {
  const k = chave(a.nome_completo);
  if (!porNome.has(k)) porNome.set(k, []);
  porNome.get(k).push(a);
}

const paraGravar = [];
const naoCasou = [];
const porApelido = [];
const porPrefixo = [];
const remanejados = [];

for (const r of registros) {
  const k = chave(r.nome);

  // Remanejamento posterior ao PDF vence o que está impresso nele.
  const destino = REMANEJADOS.get(k);
  if (destino && destino !== r.casa) {
    remanejados.push(`${r.nome}: ${r.casa} → ${destino}`);
    r.casa = destino;
  }
  let cands = porNome.get(APELIDOS.get(k) ?? k) || [];
  if (APELIDOS.has(k) && cands.length) porApelido.push(r.nome);

  // PDF às vezes traz o nome curto ("Heitor Miguel"): procura na mesma
  // série/turma alguém cujo nome comece por ele, e só aceita se for único.
  if (cands.length === 0) {
    const pref = alunos.filter(
      (a) =>
        a.serie === r.serie &&
        a.turma === r.turma &&
        (chave(a.nome_completo) + " ").startsWith(k + " "),
    );
    if (pref.length === 1) {
      cands = pref;
      porPrefixo.push(`${r.nome} → ${pref[0].nome_completo}`);
    }
  }

  // Homônimo: desempata pela série/turma do PDF.
  if (cands.length > 1) {
    const exatos = cands.filter((a) => a.serie === r.serie && a.turma === r.turma);
    cands = exatos.length === 1 ? exatos : [];
  }

  if (cands.length !== 1) {
    naoCasou.push(r);
    continue;
  }
  if (cands[0].casa !== r.casa) paraGravar.push({ id: cands[0].id, casa: r.casa });
}

if (porPrefixo.length) {
  console.log(`\nCasados por nome curto (${porPrefixo.length}):`);
  porPrefixo.forEach((p) => console.log("  " + p));
}
if (porApelido.length) {
  console.log(`\nCasados por grafia divergente conhecida (${porApelido.length}):`);
  porApelido.forEach((p) => console.log("  " + p));
}
if (remanejados.length) {
  console.log(`\nRemanejados depois do PDF (${remanejados.length}):`);
  remanejados.forEach((p) => console.log("  " + p));
}
if (naoCasou.length) {
  console.log(`\nNão achei na base (${naoCasou.length}) — ficam sem casa:`);
  naoCasou.forEach((r) => console.log(`  - ${r.nome} (${r.serie} ${r.turma}, ${r.casa})`));
}

// ---------- 5. grava ----------
// Sem process.exit() daqui pra baixo: o pdfjs deixa handles pendurados e
// sair à força faz o Node abortar no Windows. Deixa terminar sozinho.
console.log(`\nA gravar: ${paraGravar.length} aluno(s).`);

if (DRY) {
  console.log("--dry: nada foi gravado.");
} else if (!paraGravar.length) {
  console.log("Nada mudou — já está tudo em dia.");
} else {
  for (const p of paraGravar) {
    await sb(`alunos?id=eq.${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ casa: p.casa }),
    });
  }

  const conferencia = await sb("alunos?select=casa&casa=not.is.null");
  const resumo = {};
  for (const a of conferencia) resumo[a.casa] = (resumo[a.casa] || 0) + 1;
  console.log(`\nPronto. ${conferencia.length} alunos com casa:`);
  Object.entries(resumo)
    .sort()
    .forEach(([c, n]) => console.log(`  ${String(n).padStart(3)}  ${c}`));
}
