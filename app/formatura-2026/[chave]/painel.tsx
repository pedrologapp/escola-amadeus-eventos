"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { aprovarFotoTurma, escolherFotoTurma, prepararFotoCrianca, prepararFotoTurma, salvarAjuste, salvarCampo, salvarCorte, salvarEscolha, salvarFotoCrianca, salvarFotoTurma, salvarNomePlaca } from "./actions";

export interface Crianca {
  nome: string;
  turma: string;
  beca: string[];
  familia: string[];
  escolhaBeca: number;
  escolhaFamilia: number;
  aprovada: boolean;
  observacao: string | null;
}
interface Textos {
  oradora: string; juramentista: string; professora_a: string; professora_b: string; auxiliar_a: string; auxiliar_b: string; demais: string;
  titulo_mensagem: string; dedicatoria: string; diretora: string; coordenadora: string;
}
// os textos que já vêm no molde (public/formatura-placa/molde.html): aparecem no campo para a direção editar
const PADRAO = {
  titulo_mensagem: "Aos Familiares",
  dedicatoria: "Pelo amor, pela paciência e por cada passo dado ao nosso lado, dedicamos a vocês esta conquista. Com gratidão.",
  diretora: "Maria das Graças de O. Gomes",
  coordenadora: "Maria Gislene Flor Sátiro do Nascimento",
};
type Ajuste = { t: number; x: number; y: number };
type Ajustes = Partial<Record<string, Ajuste>>;
const BLOCOS: [string, string][] = [
  ["nome", "Nome da criança"], ["prof", "Professoras e auxiliar"], ["lista", "Nomes da turma"],
  ["mensagem", "Mensagem aos familiares"], ["equipe", "Direção, oradora e juramentista"], ["turma", "Título da turma"],
];
type Corte = { z: number; x: number; y: number };
type Cortes = Partial<Record<"beca" | "familia", Corte>>;
type FotoK = "beca" | "familia" | "turma";
const folgaCorte = (z: number) => { const s = 1 + 0.1 * z; return (50 * (s - 1)) / s; };
const FOTOS: [FotoK, string][] = [["beca", "Foto de beca"], ["familia", "Foto com a família"], ["turma", "Foto da turma"]];
const somar = (a?: Ajuste, b?: Ajuste): Ajuste => ({ t: (a?.t ?? 0) + (b?.t ?? 0), x: (a?.x ?? 0) + (b?.x ?? 0), y: (a?.y ?? 0) + (b?.y ?? 0) });

const C = {
  fundo: "#071430", painel: "#0B1E45", borda: "rgba(227,194,122,.28)", ouro: "#E3C27A", ouroClaro: "#F3DFA6",
  texto: "#F3EEE2", suave: "rgba(243,238,226,.68)", verde: "#7FD1A8",
};
const serif = "var(--f-serif), 'Cormorant Garamond', Georgia, serif";
const script = "var(--f-script), 'Great Vibes', cursive";

/** Placa em miniatura: o molde em public/formatura-placa, escalado para a largura do cartão. */
function Placa({ dados, titulo, aoMontar, interativa }: { dados: object; titulo: string; aoMontar?: (limitado: string[]) => void; interativa?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [esc, setEsc] = useState(0.15);
  useEffect(() => {
    const el = caixa.current; if (!el) return;
    const ro = new ResizeObserver(() => setEsc(el.clientWidth / 2400));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // o molde avisa quando terminou de montar e quais blocos bateram no limite da placa
  const aviso = useRef(aoMontar); aviso.current = aoMontar;
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.tipo === "placa:pronta") aviso.current?.(e.data.limitado ?? []); };
    window.addEventListener("message", f); return () => window.removeEventListener("message", f);
  }, []);
  const src = "/formatura-placa/molde.html#" + encodeURIComponent(JSON.stringify(dados));
  return (
    <div ref={caixa} style={{ position: "relative", width: "100%", aspectRatio: "2400 / 1782", overflow: "hidden" }}>
      <iframe title={titulo} src={src} loading="lazy" scrolling="no"
        style={{ position: "absolute", left: 0, top: 0, width: 2400, height: 1782, border: 0, transform: `scale(${esc})`, transformOrigin: "0 0", pointerEvents: interativa ? "auto" : "none" }} />
    </div>
  );
}

function Campo({ chave, campo, rotulo, valor, dica, longo }: { chave: string; campo: keyof Textos; rotulo: string; valor: string; dica?: string; longo?: boolean }) {
  const [v, setV] = useState(valor);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const salvo = useRef(valor);
  async function salvar() {
    if (v.trim() === salvo.current.trim()) return;
    if (!v.trim() && campo in PADRAO) setV(PADRAO[campo as keyof typeof PADRAO]); // apagou tudo: volta o texto padrão
    setEstado("salvando");
    const r = await salvarCampo(chave, campo, v);
    if (r.ok) { salvo.current = v; setEstado("salvo"); window.dispatchEvent(new CustomEvent("placa:texto", { detail: { campo, valor: v.trim() } })); }
    else setEstado("erro");
  }
  const estilo = { width: "100%", background: "rgba(255,255,255,.06)", border: `1px solid ${C.borda}`, borderRadius: 10, padding: "12px 14px", color: C.texto, fontSize: 16, fontFamily: "inherit", outline: "none" } as const;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: C.ouro }}>
        {rotulo}
        <span style={{ letterSpacing: 0, textTransform: "none", color: estado === "erro" ? "#ff9b8a" : C.verde }}>
          {estado === "salvando" ? "salvando…" : estado === "salvo" ? "salvo ✓" : estado === "erro" ? "não salvou, tente de novo" : ""}
        </span>
      </span>
      {longo
        ? <textarea rows={campo === "dedicatoria" ? 4 : 2} value={v} onChange={(e) => setV(e.target.value)} onBlur={salvar} style={{ ...estilo, resize: "vertical" }} />
        : <input value={v} onChange={(e) => setV(e.target.value)} onBlur={salvar} style={estilo} />}
      {dica && <span style={{ fontSize: 13, color: C.suave }}>{dica}</span>}
    </label>
  );
}

type Sugestao = { url: string; atual: boolean };

const botaoSec = { minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "0 8px" } as const;

/** Foto inteira, grande, por cima da página. */
function interia(aberta: boolean, url: string, fechar: () => void) {
  if (!aberta || !url) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Foto da turma inteira" onClick={fechar}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(3,8,20,.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 12 }}>
      <img src={url} alt="Foto da turma inteira" style={{ maxWidth: "98vw", maxHeight: "82vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }} />
      <button type="button" onClick={fechar} style={{ ...botaoSec, padding: "0 24px" }}>Fechar</button>
    </div>
  );
}

function FotoTurma({ chave, turma, url, aoMudar, sugestoes: s0 = [], aprovada: ap0 = false }: { chave: string; turma: "a" | "b"; url: string; aoMudar: (u: string) => void; sugestoes?: Sugestao[]; aprovada?: boolean }) {
  const [estado, setEstado] = useState("");
  const [sugestoes, setSugestoes] = useState(s0);
  const [ver, setVer] = useState<number | null>(null);
  const [inteira, setInteira] = useState(false);
  const [aprovada, setAprovada] = useState(ap0);
  const input = useRef<HTMLInputElement>(null);
  async function aprovar(v: boolean) {
    setAprovada(v);
    const r = await aprovarFotoTurma(chave, turma, v);
    if (!r.ok) { setAprovada(!v); setEstado(r.erro); }
  }
  // trocar: abre a próxima sugestão do fotógrafo; sem sugestões, escolhe uma foto do celular
  function trocar() {
    if (sugestoes.length > 1) { const atual = sugestoes.findIndex((s) => s.atual); setVer((atual + 1) % sugestoes.length); }
    else input.current?.click();
  }
  async function usar(i: number) {
    setEstado("salvando…");
    const r = await escolherFotoTurma(chave, turma, i);
    if (!r.ok) return setEstado(r.erro);
    setSugestoes((l) => l.map((x, j) => ({ ...x, atual: j === i })));
    aoMudar(sugestoes[i].url); setEstado("foto da turma escolhida ✓"); setVer(null);
  }
  const listaSug = sugestoes.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: C.ouro }}>Sugestões do fotógrafo: toque para ver grande</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {sugestoes.map((sg, i) => (
          <button key={i} type="button" onClick={() => setVer(i)} aria-label={`Ver a sugestão ${i + 1} grande`}
            style={{ position: "relative", padding: 0, aspectRatio: "3 / 1", borderRadius: 6, overflow: "hidden", cursor: "zoom-in", background: "#0A2350",
              border: sg.atual ? `3px solid ${C.ouro}` : "3px solid transparent" }}>
            <img src={sg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 4, top: 4, background: "rgba(0,0,0,.65)", color: "#fff", borderRadius: 6, fontSize: 12, padding: "1px 6px" }}>{i + 1}</span>
            {sg.atual && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(227,194,122,.92)", color: "#14213D", fontSize: 12, fontWeight: 700 }}>na placa</span>}
          </button>
        ))}
      </div>
      {ver !== null && (
        <div role="dialog" aria-modal="true" aria-label={`Sugestão ${ver + 1}`} onClick={() => setVer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(3,8,20,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 16 }}>
          <img onClick={(e) => e.stopPropagation()} src={sugestoes[ver].url} alt={`Sugestão ${ver + 1}`} style={{ maxWidth: "96vw", maxHeight: "70vh", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
            {sugestoes.length > 1 && <button type="button" onClick={() => setVer((ver - 1 + sugestoes.length) % sugestoes.length)} style={{ minHeight: 46, padding: "0 16px", borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, cursor: "pointer" }}>‹ Anterior</button>}
            <span style={{ color: C.suave }}>Sugestão {ver + 1} de {sugestoes.length}</span>
            {sugestoes[ver].atual
              ? <span style={{ color: C.verde, fontWeight: 700 }}>Esta é a que está na placa ✓</span>
              : <button type="button" onClick={() => usar(ver)} style={{ minHeight: 46, padding: "0 22px", borderRadius: 10, border: 0, background: C.ouro, color: "#14213D", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Usar esta foto na placa</button>}
            {sugestoes.length > 1 && <button type="button" onClick={() => setVer((ver + 1) % sugestoes.length)} style={{ minHeight: 46, padding: "0 16px", borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, cursor: "pointer" }}>Próxima ›</button>}
            <button type="button" onClick={() => setVer(null)} style={{ minHeight: 46, padding: "0 16px", borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, cursor: "pointer" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
  async function enviar(f: File) {
    setEstado("enviando…");
    const p = await prepararFotoTurma(chave, turma);
    if (!p.ok) return setEstado(p.erro);
    const { error } = await createClient().storage.from("formatura-placas").uploadToSignedUrl(p.path, p.token, f, { contentType: "image/jpeg" });
    if (error) return setEstado("Não consegui enviar. Tente de novo.");
    const r = await salvarFotoTurma(chave, turma, p.path);
    if (!r.ok) return setEstado(r.erro);
    setEstado("foto salva ✓"); if (r.url) aoMudar(r.url);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14, border: `1px solid ${C.borda}`, background: "rgba(255,255,255,.04)" }}>
      <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>Grupo V · {turma.toUpperCase()}</div>
      <button type="button" onClick={() => url && setInteira(true)} disabled={!url} aria-label="Ver a foto da turma inteira"
        style={{ padding: 0, border: aprovada ? `2px solid ${C.verde}` : 0, aspectRatio: "1052 / 372", borderRadius: 8, overflow: "hidden", background: "#0A2350", display: "flex", alignItems: "center", justifyContent: "center", color: C.suave, fontSize: 14, cursor: url ? "zoom-in" : "default" }}>
        {url ? <img src={url} alt={`Foto da turma ${turma.toUpperCase()}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "sem foto ainda"}
      </button>
      {url && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <button type="button" onClick={() => setInteira(true)} style={botaoSec}>Ver foto inteira</button>
          <button type="button" onClick={trocar} style={botaoSec}>Trocar foto</button>
          <button type="button" onClick={() => aprovar(!aprovada)}
            style={aprovada ? { ...botaoSec, borderColor: C.verde, color: C.verde } : { ...botaoSec, border: 0, background: C.ouro, color: "#14213D" }}>
            {aprovada ? "Aprovada ✓" : "Aprovar"}
          </button>
        </div>
      )}
      {interia(inteira, url, () => setInteira(false))}
      {listaSug}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()}
        style={url ? { ...botaoSec, minHeight: 40, fontSize: 14 } : { minHeight: 44, borderRadius: 10, border: 0, background: C.ouro, color: "#14213D", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
        {url ? "Enviar outra foto do celular" : "Enviar a foto da turma"}
      </button>
      {estado && <span style={{ fontSize: 13, color: estado.includes("✓") ? C.verde : C.suave }}>{estado}</span>}
    </div>
  );
}

/** Foto escolhida pela direção: reduz no próprio celular (até 2400 px) e envia; entra como opção nova e vai para a placa. */
async function reduzir(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise<Blob>((ok, erro) => cv.toBlob((b) => (b ? ok(b) : erro(new Error("blob"))), "image/jpeg", 0.9));
  } catch { return f; }
}

function TrocarFoto({ chave, nome, tipo, titulo, aoEnviar }: { chave: string; nome: string; tipo: "beca" | "familia"; titulo: string; aoEnviar: (url: string, indice: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState("");
  async function enviar(f: File) {
    setEstado("enviando…");
    const p = await prepararFotoCrianca(chave, nome, tipo);
    if (!p.ok) return setEstado(p.erro);
    const { error } = await createClient().storage.from("formatura-placas").uploadToSignedUrl(p.path, p.token, await reduzir(f), { contentType: "image/jpeg" });
    if (error) return setEstado("Não consegui enviar. Tente de novo.");
    const r = await salvarFotoCrianca(chave, nome, tipo, p.path);
    if (!r.ok) return setEstado(r.erro);
    setEstado("foto nova na placa ✓ confira e aprove"); aoEnviar(r.url, r.indice);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} disabled={estado === "enviando…"} style={{ ...botaoSec, minHeight: 44, padding: "0 16px", fontSize: 15 }}>
        Trocar {titulo} (enviar do celular)
      </button>
      {estado && <span style={{ fontSize: 13, color: estado.includes("✓") ? C.verde : C.suave }}>{estado}</span>}
    </div>
  );
}

/** Opções de foto: tocar abre a foto grande (com setas para comparar) e o botão para usar aquela. */
function Opcoes({ titulo, fotos, escolha, aoEscolher }: { titulo: string; fotos: string[]; escolha: number; aoEscolher: (i: number) => void }) {
  const [ver, setVer] = useState<number | null>(null);
  useEffect(() => {
    if (ver === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVer(null);
      if (e.key === "ArrowRight") setVer((v) => (v === null ? v : (v + 1) % fotos.length));
      if (e.key === "ArrowLeft") setVer((v) => (v === null ? v : (v - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", tecla); return () => window.removeEventListener("keydown", tecla);
  }, [ver, fotos.length]);
  if (fotos.length < 2) return null;
  const seta = { position: "absolute", top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: 26, border: `1px solid ${C.borda}`, background: "rgba(7,20,48,.8)", color: "#fff", fontSize: 26, cursor: "pointer" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: C.ouro }}>{titulo}: toque para ver grande</span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {fotos.map((u, i) => (
          <button key={i} type="button" onClick={() => setVer(i)} aria-label={`Ver ${titulo}, opção ${i + 1}, grande`}
            style={{ position: "relative", width: 132, height: 176, padding: 0, borderRadius: 8, overflow: "hidden", cursor: "zoom-in",
              border: i === escolha ? `3px solid ${C.ouro}` : "3px solid transparent", boxShadow: i === escolha ? "0 0 0 2px rgba(227,194,122,.35)" : "none", background: "#0A2350" }}>
            <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 4, top: 4, background: "rgba(0,0,0,.65)", color: "#fff", borderRadius: 6, fontSize: 12, padding: "1px 6px" }}>{i + 1}</span>
            {i === escolha && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(227,194,122,.92)", color: "#14213D", fontSize: 12, fontWeight: 700, padding: "3px 0" }}>na placa</span>}
          </button>
        ))}
      </div>
      {ver !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${titulo}, opção ${ver + 1}`} onClick={() => setVer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(3,8,20,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={fotos[ver]} alt={`${titulo}, opção ${ver + 1}`} style={{ maxWidth: "min(92vw, 900px)", maxHeight: "74vh", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }} />
            <button type="button" aria-label="Foto anterior" onClick={() => setVer((ver - 1 + fotos.length) % fotos.length)} style={{ ...seta, left: -12 }}>‹</button>
            <button type="button" aria-label="Próxima foto" onClick={() => setVer((ver + 1) % fotos.length)} style={{ ...seta, right: -12 }}>›</button>
          </div>
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ color: C.suave, fontSize: 15 }}>{titulo} · opção {ver + 1} de {fotos.length}</span>
            {ver === escolha
              ? <span style={{ color: C.verde, fontWeight: 700, fontSize: 15 }}>Esta é a que está na placa ✓</span>
              : <button type="button" onClick={() => { aoEscolher(ver); setVer(null); }}
                  style={{ minHeight: 46, padding: "0 22px", borderRadius: 10, border: 0, background: C.ouro, color: "#14213D", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Usar esta foto na placa</button>}
            <button type="button" onClick={() => setVer(null)}
              style={{ minHeight: 46, padding: "0 18px", borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, fontSize: 15, cursor: "pointer" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Nome da criança como sai na placa (só nesta placa). */
function NomePlaca({ chave, nome, valor, aoSalvar }: { chave: string; nome: string; valor: string; aoSalvar: (v: string) => void }) {
  const [v, setV] = useState(valor || nome);
  const [estado, setEstado] = useState("");
  async function salvar() {
    const novo = v.replace(/\s+/g, " ").trim();
    if (novo === (valor || nome)) return;
    setEstado("salvando…");
    const r = await salvarNomePlaca(chave, nome, novo);
    if (!r.ok) return setEstado(r.erro);
    if (!novo) setV(nome);
    aoSalvar(novo === nome ? "" : novo); setEstado("salvo ✓");
  }
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: C.ouro }}>
        Nome da criança na placa
        <span style={{ letterSpacing: 0, textTransform: "none", color: estado.includes("✓") ? C.verde : C.suave }}>{estado}</span>
      </span>
      <input value={v} onChange={(e) => setV(e.target.value)} onBlur={salvar} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        style={{ width: "100%", background: "rgba(255,255,255,.06)", border: `1px solid ${C.borda}`, borderRadius: 10, padding: "12px 14px", color: C.texto, fontSize: 16, fontFamily: "inherit", outline: "none" }} />
      <span style={{ fontSize: 13, color: C.suave }}>Só nesta placa. Apague tudo para voltar ao nome do cadastro.</span>
    </label>
  );
}

/**
 * Ajustar o texto da placa: escolhe um bloco e aumenta, diminui ou muda de lugar.
 * A placa confere a REGRA (não sai da placa, não encosta nas fotos, não bate em outro texto):
 * se a mudança não couber, ela é desfeita e aparece o aviso.
 */
function AjustarTexto({ chave, nome, global, meu, mudar, limitado, aoDesaprovar }: {
  chave: string; nome: string; global: Ajustes; meu: Ajustes; aoDesaprovar: () => void;
  mudar: (escopo: "todas" | "esta", bloco: string, a: Ajuste) => void; limitado: { blocos: string[]; vez: number } | null;
}) {
  const [escopo, setEscopo] = useState<"esta" | "todas">("esta");
  const [bloco, setBloco] = useState("nome");
  const [estado, setEstado] = useState("");
  const espera = useRef<{ escopo: "todas" | "esta"; bloco: string; antes: Ajuste; depois: Ajuste; crescer: boolean } | null>(null);
  const atual = (escopo === "todas" ? global : meu)[bloco] ?? { t: 0, x: 0, y: 0 };

  // a placa terminou de montar: aceita (e salva) ou desfaz a última mudança
  useEffect(() => {
    const p = espera.current; if (!limitado || !p) return;
    espera.current = null;
    if (p.crescer && limitado.blocos.includes(p.bloco)) {
      mudar(p.escopo, p.bloco, p.antes);
      setEstado("Não cabe mais: passaria da placa, encostaria numa foto ou bateria em outro texto.");
      return;
    }
    setEstado("salvando…");
    salvarAjuste(chave, p.escopo === "todas" ? null : nome, p.bloco, p.depois).then((r) => { setEstado(r.ok ? "salvo ✓" : r.erro); if (r.ok && p.escopo === "esta") aoDesaprovar(); });
  }, [limitado]); // eslint-disable-line react-hooks/exhaustive-deps

  function passo(d: Partial<Ajuste>, crescer: boolean, k = bloco) {
    if (espera.current) return;
    const antes = (escopo === "todas" ? global : meu)[k] ?? { t: 0, x: 0, y: 0 };
    const lim = (v: number) => Math.max(-600, Math.min(600, Math.round(v)));
    const depois = { t: Math.max(-12, Math.min(12, antes.t + (d.t ?? 0))), x: lim(antes.x + (d.x ?? 0)), y: lim(antes.y + (d.y ?? 0)) };
    espera.current = { escopo, bloco: k, antes, depois, crescer };
    setEstado("ajustando…"); mudar(escopo, k, depois);
    // se a placa não responder (rede lenta), salva assim mesmo
    setTimeout(() => { const p = espera.current; if (p && p.depois === depois) { espera.current = null; salvarAjuste(chave, p.escopo === "todas" ? null : nome, p.bloco, p.depois).then((r) => { setEstado(r.ok ? "salvo ✓" : r.erro); if (r.ok && p.escopo === "esta") aoDesaprovar(); }); } }, 12000);
  }
  // tocou ou arrastou um texto na própria placa: escolhe aquele bloco e, se arrastou, grava o novo lugar
  const arrastou = useRef<(k: string, dx: number, dy: number) => void>(() => {});
  arrastou.current = (k, dx, dy) => { setBloco(k); if (dx || dy) passo({ x: dx, y: dy }, true, k); else setEstado(""); };
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.tipo === "placa:arrastou" && BLOCOS.some(([k]) => k === e.data.bloco)) arrastou.current(e.data.bloco, Number(e.data.dx) || 0, Number(e.data.dy) || 0); };
    window.addEventListener("message", f); return () => window.removeEventListener("message", f);
  }, []);
  const P = 12; // passo de posição, em px da placa (2400 de largura)
  const b = (rot: string, aria: string, f: () => void) => (
    <button type="button" aria-label={aria} onClick={f} style={{ ...botaoSec, minWidth: 52, minHeight: 48, fontSize: 18 }}>{rot}</button>
  );
  const chip = (ativo: boolean) => ({ minHeight: 40, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 14, fontWeight: 600,
    border: `1px solid ${ativo ? C.ouro : C.borda}`, background: ativo ? C.ouro : "transparent", color: ativo ? "#14213D" : C.texto } as const);
  const mexido = atual.t || atual.x || atual.y;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: C.ouro, marginRight: 4 }}>Mudar</span>
        <button type="button" onClick={() => setEscopo("esta")} style={chip(escopo === "esta")}>Só nesta placa</button>
        <button type="button" onClick={() => setEscopo("todas")} style={chip(escopo === "todas")}>Em todas as placas</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {BLOCOS.map(([k, r]) => <button key={k} type="button" onClick={() => { setBloco(k); setEstado(""); }} style={chip(bloco === k)}>{r}</button>)}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {b("A−", "Diminuir", () => passo({ t: -1 }, false))}
          {b("A+", "Aumentar", () => passo({ t: 1 }, true))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {b("←", "Mover para a esquerda", () => passo({ x: -P }, true))}
          {b("↑", "Mover para cima", () => passo({ y: -P }, true))}
          {b("↓", "Mover para baixo", () => passo({ y: P }, true))}
          {b("→", "Mover para a direita", () => passo({ x: P }, true))}
        </div>
        {mexido ? <button type="button" onClick={() => passo({ t: -atual.t, x: -atual.x, y: -atual.y }, false)} style={{ ...botaoSec, minHeight: 48, padding: "0 14px" }}>Voltar ao normal</button> : null}
      </div>
      {estado && <span style={{ fontSize: 14, color: estado.includes("✓") ? C.verde : estado.startsWith("Não cabe") ? "#FFC98A" : C.suave }}>{estado}</span>}
    </div>
  );
}

/** Cortar as fotos: aproximar para esconder um fundo ou acabamento e arrastar a foto para escolher a parte que aparece. */
function CortarFoto({ chave, nome, foto, setFoto, cortes, mudar, temFoto, aoDesaprovar }: {
  chave: string; nome: string; foto: FotoK; setFoto: (f: FotoK) => void; cortes: Record<FotoK, Corte | undefined>;
  mudar: (f: FotoK, c: Corte) => void; temFoto: Record<FotoK, boolean>; aoDesaprovar: () => void;
}) {
  const [estado, setEstado] = useState("");
  const atual = cortes[foto] ?? { z: 0, x: 0, y: 0 };
  const vez = useRef(0);
  function gravar(f: FotoK, c: Corte) {
    const z = Math.max(0, Math.min(20, c.z)), fl = folgaCorte(z), lim = (v: number) => Math.round(Math.max(-fl, Math.min(fl, v)) * 10) / 10;
    const n = { z, x: lim(c.x), y: lim(c.y) };
    mudar(f, n); setEstado("salvando…"); const minha = ++vez.current;
    salvarCorte(chave, nome, f, n).then((r) => { if (minha !== vez.current) return; setEstado(r.ok ? "salvo ✓" : r.erro); if (r.ok && f !== "turma") aoDesaprovar(); });
  }
  const cortou = useRef<(d: { foto: FotoK; z: number; x: number; y: number }) => void>(() => {});
  cortou.current = (d) => gravar(d.foto, { z: d.z, x: d.x, y: d.y });
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.tipo === "placa:cortou" && FOTOS.some(([k]) => k === e.data.foto))
      cortou.current({ foto: e.data.foto, z: Number(e.data.z) || 0, x: Number(e.data.x) || 0, y: Number(e.data.y) || 0 }); };
    window.addEventListener("message", f); return () => window.removeEventListener("message", f);
  }, []);
  const P = 3; // passo das setas, em % da moldura
  const b = (rot: string, aria: string, fn: () => void, off = false) => (
    <button type="button" aria-label={aria} onClick={fn} disabled={off} style={{ ...botaoSec, minWidth: 52, minHeight: 48, fontSize: 18, opacity: off ? .4 : 1 }}>{rot}</button>
  );
  const chip = (ativo: boolean) => ({ minHeight: 40, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 14, fontWeight: 600,
    border: `1px solid ${ativo ? C.ouro : C.borda}`, background: ativo ? C.ouro : "transparent", color: ativo ? "#14213D" : C.texto } as const);
  const semFolga = atual.z <= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FOTOS.map(([k, r]) => <button key={k} type="button" disabled={!temFoto[k]} onClick={() => { setFoto(k); setEstado(""); }} style={{ ...chip(foto === k), opacity: temFoto[k] ? 1 : .4 }}>{r}</button>)}
      </div>
      {!temFoto[foto] ? <span style={{ fontSize: 14, color: C.suave }}>Esta foto ainda não está na placa.</span> : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {b("−", "Afastar", () => gravar(foto, { ...atual, z: atual.z - 1 }), atual.z <= 0)}
            {b("+", "Aproximar", () => gravar(foto, { ...atual, z: atual.z + 1 }), atual.z >= 20)}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {b("←", "Mostrar mais da esquerda", () => gravar(foto, { ...atual, x: atual.x + P }), semFolga)}
            {b("↑", "Mostrar mais de cima", () => gravar(foto, { ...atual, y: atual.y + P }), semFolga)}
            {b("↓", "Mostrar mais de baixo", () => gravar(foto, { ...atual, y: atual.y - P }), semFolga)}
            {b("→", "Mostrar mais da direita", () => gravar(foto, { ...atual, x: atual.x - P }), semFolga)}
          </div>
          {atual.z || atual.x || atual.y ? <button type="button" onClick={() => gravar(foto, { z: 0, x: 0, y: 0 })} style={{ ...botaoSec, minHeight: 48, padding: "0 14px" }}>Foto inteira de novo</button> : null}
        </div>
      )}
      {foto === "turma" && temFoto.turma && <span style={{ fontSize: 13, color: C.suave }}>O corte da foto da turma vale para todas as placas da turma.</span>}
      {estado && <span style={{ fontSize: 14, color: estado.includes("✓") ? C.verde : C.suave }}>{estado}</span>}
    </div>
  );
}

export function PainelPlacas({ chave, foco, criancas: inicial, textos: t0, fotoTurma: ft0, sugestoes, turmaAprovada, listas, ajustes: aj0, cortes: co0 }: { chave: string; foco: string | null; criancas: Crianca[]; textos: Textos; fotoTurma: { a: string; b: string }; sugestoes?: { a: Sugestao[]; b: Sugestao[] }; turmaAprovada?: { a: boolean; b: boolean }; listas?: { a: string[]; b: string[] }; ajustes?: { todas: Ajustes; porCrianca: Record<string, Ajustes>; nomes: Record<string, string> }; cortes?: { porCrianca: Record<string, Cortes>; turma: Partial<Record<"a" | "b", Corte>> } }) {
  const [criancas, setCriancas] = useState(inicial);
  const [textos, setTextos] = useState(t0);
  const [fotoTurma, setFotoTurma] = useState(ft0);
  const [filtro, setFiltro] = useState<"todas" | "escolher" | "sem" | "aprovadas">("todas");
  const [grande, setGrande] = useState<string | null>(null);
  const [ajG, setAjG] = useState<Ajustes>(aj0?.todas ?? {});
  const [ajA, setAjA] = useState<Record<string, Ajustes>>(aj0?.porCrianca ?? {});
  const [nomes, setNomes] = useState<Record<string, string>>(aj0?.nomes ?? {});
  const [limitado, setLimitado] = useState<{ blocos: string[]; vez: number } | null>(null);
  const [ajustar, setAjustar] = useState(false);
  const [cortando, setCortando] = useState(false);
  const [fotoCorte, setFotoCorte] = useState<FotoK>("beca");
  const [coA, setCoA] = useState<Record<string, Cortes>>(co0?.porCrianca ?? {});
  const [coT, setCoT] = useState<Partial<Record<"a" | "b", Corte>>>(co0?.turma ?? {});
  const esquecerCorte = (nome: string, f: "beca" | "familia") => setCoA((m) => { const meu = { ...(m[nome] ?? {}) }; delete meu[f]; return { ...m, [nome]: meu }; });
  const mudarAjuste = (nome: string) => (escopo: "todas" | "esta", bloco: string, a: Ajuste) => {
    if (escopo === "todas") setAjG((g) => ({ ...g, [bloco]: a }));
    else setAjA((m) => ({ ...m, [nome]: { ...(m[nome] ?? {}), [bloco]: a } }));
  };
  const desaprovar = (nome: string) => setCriancas((l) => l.map((c) => (c.nome === nome ? { ...c, aprovada: false } : c)));

  useEffect(() => {
    const f = (e: Event) => { const { campo, valor } = (e as CustomEvent).detail; setTextos((x) => ({ ...x, [campo]: valor })); };
    window.addEventListener("placa:texto", f); return () => window.removeEventListener("placa:texto", f);
  }, []);

  const porTurma = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of criancas) (m[c.turma] ??= []).push(c.nome);
    // a lista da placa leva TODOS os alunos da turma (também quem não vai à formatura)
    for (const c of criancas) { const toda = c.turma.endsWith("B") ? listas?.b : listas?.a; if (toda?.length) m[c.turma] = [...toda]; }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return m;
  }, [criancas]);

  const dadosDe = (c: Crianca) => {
    const b = c.turma.endsWith("B");
    return {
      turma: c.turma, alunos: porTurma[c.turma] ?? [], homenageado: c.nome,
      fotoBeca: c.beca[c.escolhaBeca] ?? "", fotoFamilia: c.familia[c.escolhaFamilia] ?? "", fotoTurma: b ? fotoTurma.b : fotoTurma.a,
      oradora: textos.oradora, juramentista: textos.juramentista, professora: b ? textos.professora_b : textos.professora_a, auxiliar: b ? textos.auxiliar_b : textos.auxiliar_a, demais: textos.demais,
      tituloMensagem: textos.titulo_mensagem, dedicatoria: textos.dedicatoria, diretora: textos.diretora, coordenadora: textos.coordenadora,
      nomePlaca: nomes[c.nome] ?? "",
      cortes: { beca: coA[c.nome]?.beca, familia: coA[c.nome]?.familia, turma: b ? coT.b : coT.a },
      ajustes: Object.fromEntries(BLOCOS.map(([k]) => [k, somar(ajG[k], ajA[c.nome]?.[k])])),
    };
  };

  // sem a foto de beca não há placa; sem a da família a placa sai com o espaço vazio e um aviso (observacao)
  const semFotos = (c: Crianca) => !c.beca.length;
  const precisaEscolher = (c: Crianca) => !semFotos(c) && (c.beca.length > 1 || c.familia.length > 1) && !c.aprovada;
  const visiveis = criancas.filter((c) => filtro === "todas" ? true : filtro === "escolher" ? precisaEscolher(c) : filtro === "sem" ? semFotos(c) : c.aprovada);
  const contar = { todas: criancas.length, escolher: criancas.filter(precisaEscolher).length, sem: criancas.filter(semFotos).length, aprovadas: criancas.filter((c) => c.aprovada).length };

  async function mudar(nome: string, m: { beca?: number; familia?: number; aprovada?: boolean }) {
    setCriancas((l) => l.map((c) => c.nome !== nome ? c : { ...c, ...(m.beca !== undefined && { escolhaBeca: m.beca }), ...(m.familia !== undefined && { escolhaFamilia: m.familia }), ...(m.aprovada !== undefined && { aprovada: m.aprovada }) }));
    if (m.beca !== undefined) esquecerCorte(nome, "beca");
    if (m.familia !== undefined) esquecerCorte(nome, "familia");
    const r = await salvarEscolha(chave, nome, m);
    if (!r.ok) alert(r.erro);
  }

  const so = foco ? criancas.find((c) => c.nome === foco) : null;
  const pos = so ? criancas.indexOf(so) : -1;
  const linkDe = (c?: Crianca) => (c ? `/formatura-2026/${chave}?aluno=${encodeURIComponent(c.nome)}` : `/formatura-2026/${chave}`);
  const anterior = pos > 0 ? criancas[pos - 1] : undefined, proxima = pos >= 0 && pos < criancas.length - 1 ? criancas[pos + 1] : undefined;
  const botaoNav = { display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", borderRadius: 10, border: `1px solid ${C.borda}`, color: C.texto, textDecoration: "none", fontSize: 15 } as const;
  if (so) return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% -10%, #12306A 0%, ${C.fundo} 55%)`, color: C.texto, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 16px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: script, fontSize: 40, color: C.ouroClaro, lineHeight: 1 }}>Formatura 2026</div>
            <h1 style={{ margin: "4px 0 0", fontFamily: serif, fontWeight: 600, fontSize: 34 }}>{so.nome}</h1>
            <div style={{ color: C.suave }}>{so.turma}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <a href={`/formatura-2026/${chave}`} style={{ ...botaoNav, color: C.ouro }}>☰ Lista</a>
            {anterior && <a href={linkDe(anterior)} style={botaoNav}>‹ Anterior</a>}
            <span style={{ color: C.suave, fontSize: 14 }}>{pos + 1} de {criancas.length}</span>
            {proxima && <a href={linkDe(proxima)} style={botaoNav}>Próxima ›</a>}
          </div>
        </div>
        {/* ajustando o texto, a placa fica presa no alto da tela para ver cada mudança enquanto toca nos botões */}
        <div style={{ borderRadius: 12, overflow: "hidden", ...((ajustar || cortando) && { position: "sticky", top: 0, zIndex: 5, boxShadow: "0 12px 30px rgba(0,0,0,.55)",
          width: "min(100%, calc(48vh * 2400 / 1782))", margin: "0 auto", background: C.fundo }) }}><Placa dados={{ ...dadosDe(so), arrastar: ajustar, cortar: cortando ? fotoCorte : "" }} interativa={ajustar || cortando} titulo={`Placa de ${so.nome}`} aoMontar={(l) => setLimitado({ blocos: l, vez: Date.now() })} /></div>
        {semFotos(so) && <div style={{ fontSize: 16, color: "#FFC98A" }}>As fotos desta criança ainda não chegaram no Drive.</div>}
        {so.observacao && !semFotos(so) && <div style={{ fontSize: 16, color: C.suave }}>{so.observacao}</div>}
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <Opcoes titulo="Foto de beca" fotos={so.beca} escolha={so.escolhaBeca} aoEscolher={(i) => mudar(so.nome, { beca: i })} />
          <Opcoes titulo="Foto com a família" fotos={so.familia} escolha={so.escolhaFamilia} aoEscolher={(i) => mudar(so.nome, { familia: i })} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <TrocarFoto chave={chave} nome={so.nome} tipo="beca" titulo="a foto de beca" aoEnviar={(u, i) => { esquecerCorte(so.nome, "beca"); setCriancas((l) => l.map((c) => c.nome !== so.nome ? c : { ...c, beca: [...c.beca, u], escolhaBeca: i, aprovada: false })); }} />
          <TrocarFoto chave={chave} nome={so.nome} tipo="familia" titulo="a foto da família" aoEnviar={(u, i) => { esquecerCorte(so.nome, "familia"); setCriancas((l) => l.map((c) => c.nome !== so.nome ? c : { ...c, familia: [...c.familia, u], escolhaFamilia: i, aprovada: false, observacao: null })); }} />
          <button type="button" onClick={() => { setCortando((v) => !v); setAjustar(false); }} aria-expanded={cortando}
            style={{ ...botaoSec, minHeight: 44, padding: "0 16px", fontSize: 15, ...(cortando && { borderColor: C.ouro, color: C.ouro }) }}>
            {cortando ? "Fechar corte das fotos" : "Cortar as fotos"}
          </button>
          <button type="button" onClick={() => { setAjustar((v) => !v); setCortando(false); }} aria-expanded={ajustar}
            style={{ ...botaoSec, minHeight: 44, padding: "0 16px", fontSize: 15, ...(ajustar && { borderColor: C.ouro, color: C.ouro }) }}>
            {ajustar ? "Fechar ajuste do texto" : "Ajustar o texto da placa"}
          </button>
        </div>
        {cortando && (
          <section style={{ display: "flex", flexDirection: "column", gap: 18, padding: 20, borderRadius: 16, background: C.painel, border: `1px solid ${C.borda}` }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Cortar as fotos</h2>
              <p style={{ margin: "4px 0 0", color: C.suave, fontSize: 15, lineHeight: 1.5 }}>
                Escolha a foto e toque em + para aproximar: assim some um fundo ou uma borda que não deve aparecer. Depois arraste a foto com o dedo, na própria placa, para escolher a parte que fica.
                A foto sempre preenche a moldura inteira.
              </p>
            </div>
            <CortarFoto chave={chave} nome={so.nome} foto={fotoCorte} setFoto={setFotoCorte}
              cortes={{ beca: coA[so.nome]?.beca, familia: coA[so.nome]?.familia, turma: so.turma.endsWith("B") ? coT.b : coT.a }}
              temFoto={{ beca: !!dadosDe(so).fotoBeca, familia: !!dadosDe(so).fotoFamilia, turma: !!dadosDe(so).fotoTurma }}
              mudar={(f, c) => { if (f === "turma") setCoT((m) => ({ ...m, [so.turma.endsWith("B") ? "b" : "a"]: c })); else setCoA((m) => ({ ...m, [so.nome]: { ...(m[so.nome] ?? {}), [f]: c } })); }}
              aoDesaprovar={() => desaprovar(so.nome)} />
          </section>
        )}
        {ajustar && (
          <section style={{ display: "flex", flexDirection: "column", gap: 18, padding: 20, borderRadius: 16, background: C.painel, border: `1px solid ${C.borda}` }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Ajustar o texto</h2>
              <p style={{ margin: "4px 0 0", color: C.suave, fontSize: 15, lineHeight: 1.5 }}>
                Toque num texto da placa e arraste com o dedo até onde quiser, ou escolha o texto abaixo e use os botões (A+ e A− mudam o tamanho). Nada pode sair da placa nem encostar nas fotos:
                quando não couber mais, a placa avisa e volta.
              </p>
            </div>
            <AjustarTexto chave={chave} nome={so.nome} global={ajG} meu={ajA[so.nome] ?? {}} mudar={mudarAjuste(so.nome)} limitado={limitado} aoDesaprovar={() => desaprovar(so.nome)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, paddingTop: 8, borderTop: `1px solid rgba(227,194,122,.14)` }}>
              <NomePlaca chave={chave} nome={so.nome} valor={nomes[so.nome] ?? ""} aoSalvar={(v) => { setNomes((m) => ({ ...m, [so.nome]: v })); desaprovar(so.nome); }} />
              <Campo chave={chave} campo="titulo_mensagem" rotulo="Título da mensagem" valor={textos.titulo_mensagem || PADRAO.titulo_mensagem} dica="Vale para todas as placas." />
              <Campo chave={chave} campo={so.turma.endsWith("B") ? "professora_b" : "professora_a"} rotulo={`Professora do ${so.turma}`} valor={so.turma.endsWith("B") ? textos.professora_b : textos.professora_a} dica="Vale para as placas da turma." />
              <Campo chave={chave} campo={so.turma.endsWith("B") ? "auxiliar_b" : "auxiliar_a"} rotulo={`Auxiliar do ${so.turma}`} valor={so.turma.endsWith("B") ? textos.auxiliar_b : textos.auxiliar_a} dica="Vale para as placas da turma." />
              <Campo chave={chave} campo="diretora" rotulo="Diretora" valor={textos.diretora || PADRAO.diretora} dica="Vale para todas as placas." />
              <Campo chave={chave} campo="coordenadora" rotulo="Coordenadora" valor={textos.coordenadora || PADRAO.coordenadora} dica="Vale para todas as placas." />
            </div>
            <Campo chave={chave} campo="dedicatoria" rotulo="Mensagem aos familiares" valor={textos.dedicatoria || PADRAO.dedicatoria} longo dica="Vale para todas as placas. A letra se ajusta sozinha ao espaço." />
          </section>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!semFotos(so) && !so.aprovada && (
            <button type="button" onClick={async () => { await mudar(so.nome, { aprovada: true }); window.location.href = linkDe(proxima); }}
              style={{ minHeight: 50, padding: "0 28px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 16, border: 0, background: C.ouro, color: "#14213D" }}>
              {proxima ? "Aprovar e ir para a próxima ›" : "Aprovar e voltar para a lista"}
            </button>
          )}
          {!semFotos(so) && so.aprovada && (
            <button type="button" onClick={() => mudar(so.nome, { aprovada: false })}
              style={{ minHeight: 50, padding: "0 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 16, border: `1px solid ${C.verde}`, background: "transparent", color: C.verde }}>
              Aprovada ✓ (tocar para desfazer)
            </button>
          )}
          {(semFotos(so) || so.aprovada) && proxima && <a href={linkDe(proxima)} style={{ ...botaoNav, minHeight: 50 }}>Próxima ›</a>}
        </div>
      </div>
    </div>
  );

  const aberta = criancas.find((c) => c.nome === grande);

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% -10%, #12306A 0%, ${C.fundo} 55%)`, color: C.texto, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 16px 80px", display: "flex", flexDirection: "column", gap: 36 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "center", alignItems: "center" }}>
          <img src="/formatura-placa/logo-900.png" alt="" width={72} height={72} style={{ borderRadius: "50%", boxShadow: "0 0 0 3px #B8892B" }} />
          <div style={{ fontFamily: script, fontSize: 52, color: C.ouroClaro, lineHeight: 1.1 }}>Formatura 2026</div>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 34 }}>Placas do Grupo V</h1>
          <p style={{ margin: "6px 0 0", maxWidth: 640, color: C.suave, fontSize: 16, lineHeight: 1.55 }}>
            Cada criança já tem a placa montada com as fotos escolhidas pelo fotógrafo. Complete os nomes abaixo e envie a foto de cada turma:
            tudo aparece em todas as placas na hora. Onde houver mais de uma foto boa, escolha a preferida e aprove a placa.
          </p>
        </header>

        <section style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 18, background: C.painel, border: `1px solid ${C.borda}` }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 28, fontWeight: 600 }}>1. O que falta preencher</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <Campo chave={chave} campo="oradora" rotulo="Oradora" valor={textos.oradora} dica="Nome completo da criança." />
            <Campo chave={chave} campo="juramentista" rotulo="Juramentista" valor={textos.juramentista} dica="Nome completo da criança." />
            <Campo chave={chave} campo="professora_a" rotulo="Professora do Grupo V · A" valor={textos.professora_a} />
            <Campo chave={chave} campo="professora_b" rotulo="Professora do Grupo V · B" valor={textos.professora_b} />
            <Campo chave={chave} campo="auxiliar_a" rotulo="Auxiliar do Grupo V · A" valor={textos.auxiliar_a} />
            <Campo chave={chave} campo="auxiliar_b" rotulo="Auxiliar do Grupo V · B" valor={textos.auxiliar_b} />
          </div>
          <Campo chave={chave} campo="demais" rotulo="E demais professores" valor={textos.demais} longo dica="Separe os nomes com vírgula." />
          <Campo chave={chave} campo="dedicatoria" rotulo="Mensagem aos familiares" valor={textos.dedicatoria || PADRAO.dedicatoria} longo dica="Vale para todas as placas. Para mudar tamanho e posição dos textos, abra uma placa e toque em “Ajustar o texto da placa”." />
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 18, background: C.painel, border: `1px solid ${C.borda}` }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 28, fontWeight: 600 }}>2. Foto de cada turma</h2>
          <p style={{ margin: 0, color: C.suave }}>A foto da turma com as professoras. Pode ser tirada do celular, na maior qualidade.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FotoTurma chave={chave} turma="a" aprovada={turmaAprovada?.a} sugestoes={sugestoes?.a} url={fotoTurma.a} aoMudar={(u) => { setFotoTurma((x) => ({ ...x, a: u })); setCoT((m) => ({ ...m, a: undefined })); }} />
            <FotoTurma chave={chave} turma="b" aprovada={turmaAprovada?.b} sugestoes={sugestoes?.b} url={fotoTurma.b} aoMudar={(u) => { setFotoTurma((x) => ({ ...x, b: u })); setCoT((m) => ({ ...m, b: undefined })); }} />
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 28, fontWeight: 600 }}>3. As placas</h2>
          <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([["todas", "Todas"], ["escolher", "Precisa escolher"], ["sem", "Sem fotos ainda"], ["aprovadas", "Aprovadas"]] as const).map(([k, r]) => (
              <button key={k} role="tab" aria-selected={filtro === k} type="button" onClick={() => setFiltro(k)}
                style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  border: `1px solid ${filtro === k ? C.ouro : C.borda}`, background: filtro === k ? C.ouro : "transparent", color: filtro === k ? "#14213D" : C.texto }}>
                {r} · {contar[k]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.borda}`, background: C.painel }}>
            {visiveis.map((c, i) => {
              const st = c.aprovada ? ["Aprovada ✓", C.verde] : semFotos(c) ? ["Sem fotos ainda", "#FFC98A"] : precisaEscolher(c) ? ["Escolher fotos", C.ouro] : ["Para aprovar", C.texto];
              return (
                <a key={c.nome} href={`/formatura-2026/${chave}?aluno=${encodeURIComponent(c.nome)}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", minHeight: 56, textDecoration: "none", color: C.texto,
                    borderTop: i ? `1px solid rgba(227,194,122,.14)` : "none" }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{c.nome}</span>
                    <span style={{ fontSize: 13, color: C.suave }}>{c.turma}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: st[1], border: `1px solid ${st[1]}`, borderRadius: 999, padding: "4px 10px", opacity: .95 }}>{st[0]}</span>
                    <span aria-hidden="true" style={{ color: C.ouro, fontSize: 22 }}>›</span>
                  </span>
                </a>
              );
            })}
            {!visiveis.length && <div style={{ padding: 20, color: C.suave }}>Nenhuma criança neste filtro.</div>}
          </div>
        </section>
      </div>

      {aberta && (
        <div role="dialog" aria-modal="true" aria-label={`Placa de ${aberta.nome}`} onClick={() => setGrande(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(3,8,20,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div style={{ width: "min(1400px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <Placa dados={dadosDe(aberta)} titulo={`Placa de ${aberta.nome}`} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => setGrande(null)} style={{ minHeight: 44, padding: "0 20px", borderRadius: 10, border: `1px solid ${C.borda}`, background: "transparent", color: C.texto, cursor: "pointer" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
