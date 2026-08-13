#!/usr/bin/env node
/**
 * Dia dos Pais — comprime e sobe os vídeos/fotos em lote.
 *
 * Casa cada arquivo com um aluno pelo NOME DO ARQUIVO. Ou seja:
 * nomeie os arquivos com o nome da criança e o resto é automático.
 *
 *   "Abner Gabriel.mp4"          → Abner Gabriel Tomaz da Silva Araújo
 *   "maria clara - 3 ano.mov"    → Maria Clara ...
 *
 * Uso:
 *   # 1) SEMPRE rode primeiro em modo de conferência (não muda nada):
 *   node scripts/subir-videos-pais.mjs --videos "C:/videos-pais" --dry
 *
 *   # 2) Conferiu o casamento dos nomes? Rode pra valer:
 *   node scripts/subir-videos-pais.mjs --videos "C:/videos-pais"
 *
 *   # Fotos (não precisam de ffmpeg, só redimensionam):
 *   node scripts/subir-videos-pais.mjs --fotos "C:/fotos-alunos"
 *
 * Requisitos: ffmpeg no PATH (só pra vídeo).
 *   winget install Gyan.FFmpeg
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BUCKET = "dia-dos-pais";
const EXT_VIDEO = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv", ".3gp"]);
const EXT_FOTO = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp"]);

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
function arg(nome) {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
}
const pastaVideos = arg("--videos");
const pastaFotos = arg("--fotos");
const dry = args.includes("--dry");

if (!pastaVideos && !pastaFotos) {
  console.error(
    "Informe --videos <pasta> e/ou --fotos <pasta>.\n" +
      'Ex.: node scripts/subir-videos-pais.mjs --videos "C:/videos-pais" --dry',
  );
  process.exit(1);
}

// ---------------------------------------------------------------- env
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
for (const bruta of fs
  .readFileSync(path.join(raiz, ".env.local"), "utf8")
  .split(/\r?\n/)) {
  // `.trim()` antes do match: um .env.local com linhas em CRLF (o que
  // acontece se alguma foi acrescentada por ferramenta do Windows) deixa
  // um \r que impede o `$` de casar, e a variável some silenciosamente.
  const m = bruta.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SUPABASE || !CHAVE) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const cabecalhos = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };

// ---------------------------------------------------- casamento de nomes
/** Tira acento, pontuação e caixa — "José" e "jose" viram a mesma coisa. */
function normalizar(txt) {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras que não ajudam a identificar ninguém. */
const RUIDO = new Set([
  "video", "videos", "img", "vid", "mov", "final", "editado", "copia",
  "de", "da", "do", "dos", "das", "e", "ano", "turma", "pais",
]);

function tokens(txt) {
  return normalizar(txt)
    .split(" ")
    .filter((t) => t.length > 1 && !RUIDO.has(t) && !/^\d+$/.test(t));
}

/**
 * Acha o aluno cujo nome melhor casa com o nome do arquivo.
 * Devolve { card, pontos, ambiguo }.
 *
 * Regra: conta quantos tokens do arquivo aparecem no nome do aluno.
 * Empate no topo = ambíguo, e a gente NÃO adivinha — entrega o vídeo
 * do filho errado pro pai errado é o pior erro possível aqui.
 */
function casar(nomeArquivo, cards) {
  const alvo = tokens(path.parse(nomeArquivo).name);
  if (alvo.length === 0) return { card: null, pontos: 0, ambiguo: false };

  const notas = cards.map((card) => {
    const nome = tokens(card.aluno_nome);
    let pontos = 0;
    for (const t of alvo) {
      if (nome.includes(t)) pontos += 2; // token inteiro igual
      else if (nome.some((n) => n.startsWith(t) && t.length >= 3)) pontos += 1;
    }
    return { card, pontos };
  });

  notas.sort((a, b) => b.pontos - a.pontos);
  const melhor = notas[0];
  if (!melhor || melhor.pontos === 0) return { card: null, pontos: 0, ambiguo: false };

  const ambiguo = notas.length > 1 && notas[1].pontos === melhor.pontos;
  return { card: melhor.card, pontos: melhor.pontos, ambiguo };
}

// ---------------------------------------------------------------- ffmpeg
async function temFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprime pra 720p no lado menor, H.264 + AAC.
 *
 * -movflags +faststart é o detalhe que mais importa: joga o índice do
 * arquivo pro começo, então o vídeo começa a tocar enquanto baixa. Sem
 * isso o pai fica olhando pra tela preta até o download inteiro acabar.
 */
async function comprimir(entrada, saida) {
  await execFileAsync(
    "ffmpeg",
    [
      "-y", "-i", entrada,
      "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)':flags=lanczos",
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-ac", "2",
      "-movflags", "+faststart",
      saida,
    ],
    { maxBuffer: 1024 * 1024 * 32 },
  );
}

// ---------------------------------------------------------------- supabase
async function buscarCards() {
  const r = await fetch(
    `${URL_SUPABASE}/rest/v1/videos_pais?select=id,codigo,aluno_nome,serie,turma,video_path,foto_path`,
    { headers: cabecalhos },
  );
  if (!r.ok) throw new Error(`Erro ao buscar cards: ${r.status} ${await r.text()}`);
  return r.json();
}

async function subir(caminhoLocal, destino, contentType) {
  const corpo = fs.readFileSync(caminhoLocal);
  const r = await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}/${destino}`, {
    method: "POST",
    headers: { ...cabecalhos, "Content-Type": contentType, "x-upsert": "true" },
    body: corpo,
  });
  if (!r.ok) throw new Error(`Upload falhou (${r.status}): ${await r.text()}`);
}

async function gravarPath(id, campo, valor) {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/videos_pais?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...cabecalhos, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ [campo]: valor, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`Update falhou (${r.status}): ${await r.text()}`);
}

// ---------------------------------------------------------------- fluxo
function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

async function processar(pasta, tipo, cards) {
  const extensoes = tipo === "video" ? EXT_VIDEO : EXT_FOTO;
  const arquivos = fs
    .readdirSync(pasta)
    .filter((f) => extensoes.has(path.extname(f).toLowerCase()));

  if (arquivos.length === 0) {
    console.log(`\nNenhum arquivo de ${tipo} em ${pasta}`);
    return;
  }

  console.log(`\n=== ${tipo.toUpperCase()} — ${arquivos.length} arquivo(s) ===\n`);

  const okList = [];
  const problemas = [];
  const usados = new Map(); // aluno_id → arquivo (pega dois arquivos pro mesmo aluno)

  for (const arquivo of arquivos) {
    const { card, pontos, ambiguo } = casar(arquivo, cards);
    if (!card) {
      problemas.push(`  SEM DONO   ${arquivo}  — nenhum aluno bate com esse nome`);
      continue;
    }
    if (ambiguo) {
      problemas.push(`  AMBIGUO    ${arquivo}  → poderia ser ${card.aluno_nome} ou outro`);
      continue;
    }
    if (usados.has(card.id)) {
      problemas.push(`  DUPLICADO  ${arquivo}  → ${card.aluno_nome} já recebeu "${usados.get(card.id)}"`);
      continue;
    }
    usados.set(card.id, arquivo);
    okList.push({ arquivo, card, pontos });
  }

  for (const { arquivo, card, pontos } of okList) {
    console.log(`  OK (${pontos})  ${arquivo}\n            → ${card.aluno_nome} [${card.serie ?? "?"} ${card.turma ?? ""}]`);
  }
  if (problemas.length) {
    console.log("\n  --- precisam de atenção ---");
    problemas.forEach((p) => console.log(p));
  }

  // Quem ficou sem arquivo nenhum
  const semArquivo = cards.filter((c) => !usados.has(c.id));
  if (semArquivo.length) {
    console.log(`\n  --- ${semArquivo.length} aluno(s) sem ${tipo} ---`);
    semArquivo.slice(0, 20).forEach((c) => console.log(`  FALTA      ${c.aluno_nome}`));
    if (semArquivo.length > 20) console.log(`  ... e mais ${semArquivo.length - 20}`);
  }

  if (dry) {
    console.log(`\n[--dry] Nada foi enviado. Confira a lista acima e rode sem --dry.`);
    return;
  }

  // ---- envio de verdade ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pais-"));
  let enviados = 0;

  for (const { arquivo, card } of okList) {
    const origem = path.join(pasta, arquivo);
    process.stdout.write(`  enviando ${card.aluno_nome}… `);

    try {
      if (tipo === "video") {
        const destinoLocal = path.join(tmp, `${card.codigo}.mp4`);
        const antes = fs.statSync(origem).size;
        await comprimir(origem, destinoLocal);
        const depois = fs.statSync(destinoLocal).size;

        await subir(destinoLocal, `videos/${card.codigo}.mp4`, "video/mp4");
        await gravarPath(card.id, "video_path", `videos/${card.codigo}.mp4`);
        fs.unlinkSync(destinoLocal);

        console.log(`ok (${mb(antes)}MB → ${mb(depois)}MB)`);
      } else {
        const ext = path.extname(arquivo).toLowerCase() === ".png" ? "png" : "jpg";
        const tipoMime = ext === "png" ? "image/png" : "image/jpeg";
        await subir(origem, `fotos/${card.codigo}.${ext}`, tipoMime);
        await gravarPath(card.id, "foto_path", `fotos/${card.codigo}.${ext}`);
        console.log(`ok (${mb(fs.statSync(origem).size)}MB)`);
      }
      enviados++;
    } catch (e) {
      console.log(`FALHOU — ${e.message}`);
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  ${enviados}/${okList.length} ${tipo}(s) enviado(s).`);
}

// ---------------------------------------------------------------- main
const cards = await buscarCards();
if (cards.length === 0) {
  console.error(
    "Nenhum card em videos_pais. Gere os cards primeiro no admin:\n" +
      "  admin.escolaamadeus.com/dia-dos-pais",
  );
  process.exit(1);
}
console.log(`${cards.length} card(s) cadastrado(s).`);

if (pastaVideos) {
  if (!dry && !(await temFfmpeg())) {
    console.error(
      "\nffmpeg não encontrado no PATH. Instale com:\n" +
        "  winget install Gyan.FFmpeg\n" +
        "e abra um terminal novo depois.",
    );
    process.exit(1);
  }
  await processar(pastaVideos, "video", cards);
}
if (pastaFotos) {
  await processar(pastaFotos, "foto", cards);
}
