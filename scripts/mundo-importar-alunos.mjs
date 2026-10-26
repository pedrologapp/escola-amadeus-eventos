// Leva os alunos da prévia do Mundo de Arboria (as turmas do 4º ano importadas do Activesoft, mais o Aluno Teste) para a tabela
// mundo_alunos do Supabase da escola (26/10/2026). Usa o mesmo arquivo da prévia (Arboria/Mundo/jogo/servidor/previa-dados.json,
// que fica só neste computador), então os cartões QR já impressos continuam valendo. Não apaga ninguém; atualiza nome, turma,
// aniversário e casa de quem já existe. Não mostra dados pessoais na tela, só as contagens.
// Uso (na pasta do Sistema, depois de aplicar a migração 0072): node scripts/mundo-importar-alunos.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ARQ = path.join("..", "..", "Arboria", "Mundo", "jogo", "servidor", "previa-dados.json");
const D = JSON.parse(fs.readFileSync(ARQ, "utf8"));

const linhas = [];
for (const t of D.turmas) for (const a of t.alunos) linhas.push({ id: a.id, nome: a.nome, turma_id: t.id, turma_nome: t.nome, nascimento: a.nascimento || null, casa: a.casa ?? null, qr: a.qr, pontos_semana: a.pontosSemana || 0 });
const { error } = await db.from("mundo_alunos").upsert(linhas, { onConflict: "id" });
if (error) { console.log("erro:", error.message); process.exit(1); }
for (const t of D.turmas) console.log(`${t.nome}: ${t.alunos.length} alunos`);
console.log(`pronto: ${linhas.length} alunos no mundo_alunos.`);
