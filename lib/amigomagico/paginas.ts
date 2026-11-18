import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * As páginas estáticas do kit da formatura do Grupo V (menu e caderno da professora), servidas pelas rotas de
 * app/amigomagico só para quem entrou. Ficam em lib/amigomagico (fora de public/, senão abririam pelo link direto).
 * A tela de login é montada aqui, no mesmo visual do caderno (capa azul, logo branca, o gato).
 */

const cache = new Map<string, string>();
export function paginaDoKit(nome: "menu" | "caderno"): string {
  if (!cache.has(nome) || process.env.NODE_ENV !== "production") {
    cache.set(nome, readFileSync(path.join(process.cwd(), "lib", "amigomagico", `${nome}.html`), "utf8"));
  }
  return cache.get(nome)!;
}

export const DESTINOS = { caderno: "/amigomagico/caderno", diario: "/amigomagico/diario" } as const;
export type Destino = keyof typeof DESTINOS;
export const ehDestino = (d: unknown): d is Destino => typeof d === "string" && d in DESTINOS;

export function paginaLogin({ erro, para, usuario }: { erro?: string; para?: Destino; usuario?: string }): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Meu Mundo da Imaginação · Grupo V</title>
<meta property="og:title" content="Meu Mundo da Imaginação · Formatura do Grupo V">
<meta property="og:description" content="O kit das professoras: caderno, vídeo, caderno da criança e o diário da formatura.">
<meta property="og:image" content="https://www.escolaamadeus.com/amigomagico/img/capa.jpg">
<meta name="theme-color" content="#1E2C78">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>
:root { --papel: #FFFDF7; --pauta: #DCE6F1; --tinta: #22338A; --tinta-2: #4A5A9E; --tinta-3: #8E98C6; --laranja: #E9832A; --rosa: #E5747D; --capa: #1E2C78; --capa-escura: #16205A; --mesa: #ECE4D6;
  --titulo: Caveat, "Segoe Print", cursive; --mao: "Patrick Hand", "Segoe Print", cursive; }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { background: var(--mesa); font-family: var(--mao); color: var(--tinta); -webkit-tap-highlight-color: transparent; }
.capa { position: relative; min-height: 100dvh; max-width: 520px; margin: 0 auto; overflow: hidden; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  padding: calc(24px + env(safe-area-inset-top)) 58px calc(24px + env(safe-area-inset-bottom)) 40px;
  background: radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,.08), transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px), linear-gradient(160deg, var(--capa), var(--capa-escura)); }
.capa::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 20px; background: linear-gradient(90deg, rgba(0,0,0,.28), rgba(0,0,0,.06) 70%, rgba(255,255,255,.06)); }
.elastico { position: absolute; top: 0; bottom: 0; right: 26px; width: 12px; background: linear-gradient(90deg, #C9661A, var(--laranja) 40%, #F5A35A 60%, #C9661A); box-shadow: 0 0 10px rgba(0,0,0,.35); }
.logo { width: 200px; max-width: 100%; height: auto; }
.gato { width: 150px; max-width: 50%; height: auto; transform: rotate(-6deg); filter: drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(0 8px 10px rgba(0,0,0,.35)); }
form { position: relative; width: 100%; max-width: 300px; background: var(--papel); color: var(--tinta); border-radius: 10px; padding: 18px 18px 16px; box-shadow: 0 12px 26px rgba(0,0,0,.38);
  background-image: repeating-linear-gradient(180deg, transparent 0 31px, var(--pauta) 31px 32px); }
form::after { content: ""; position: absolute; inset: 6px; border: 1.5px solid var(--tinta); border-radius: 6px; opacity: .45; pointer-events: none; }
h1 { margin: 0; text-align: center; font: 700 34px/34px var(--titulo); }
.sub { margin: 4px 0 12px; text-align: center; font: 700 21px/22px var(--titulo); color: var(--rosa); }
label { display: block; margin-top: 8px; font-size: 16px; color: var(--tinta-2); }
input { display: block; width: 100%; margin-top: 3px; padding: 10px 12px; border: 1.5px solid var(--tinta-3); border-radius: 8px; background: #fff; font: 400 18px var(--mao); color: var(--tinta); }
input:focus { outline: 3px solid rgba(233, 131, 42, .45); border-color: var(--laranja); }
button { position: relative; z-index: 1; display: block; width: 100%; margin-top: 14px; padding: 11px; border: 0; border-radius: 24px; background: var(--laranja); color: #fff; font: 700 26px/1 var(--titulo); cursor: pointer; }
button:active { transform: scale(.98); }
.erro { position: relative; z-index: 1; margin: 10px 0 0; padding: 7px 10px; border-radius: 8px; background: #FDECEC; color: #B33A45; font-size: 16px; text-align: center; }
</style>
</head>
<body>
<main class="capa">
  <span class="elastico" aria-hidden="true"></span>
  <img class="logo" src="/amigomagico/img/amadeus-horizontal.webp" alt="Centro Educacional Amadeus" width="560" height="139">
  <img class="gato" src="/amigomagico/img/gato-caderno.webp" alt="" width="720" height="565">
  <form method="post" action="/amigomagico/entrar">
    <h1>Meu Mundo da Imaginação</h1>
    <p class="sub">Grupo V · professoras</p>
    ${para ? `<input type="hidden" name="para" value="${esc(para)}">` : ""}
    <label for="usuario">Usuário</label>
    <input id="usuario" name="usuario" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required value="${esc(usuario ?? "")}">
    <label for="senha">Senha</label>
    <input id="senha" name="senha" type="password" autocomplete="current-password" required>
    ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ""}
    <button type="submit">Entrar</button>
  </form>
</main>
</body>
</html>`;
}

export const cabecalhosKit = { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex" };
