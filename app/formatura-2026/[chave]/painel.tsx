"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { escolherFotoTurma, prepararFotoTurma, salvarCampo, salvarEscolha, salvarFotoTurma } from "./actions";

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
interface Textos { oradora: string; juramentista: string; professora_a: string; professora_b: string; demais: string }

const C = {
  fundo: "#071430", painel: "#0B1E45", borda: "rgba(227,194,122,.28)", ouro: "#E3C27A", ouroClaro: "#F3DFA6",
  texto: "#F3EEE2", suave: "rgba(243,238,226,.68)", verde: "#7FD1A8",
};
const serif = "var(--f-serif), 'Cormorant Garamond', Georgia, serif";
const script = "var(--f-script), 'Great Vibes', cursive";

/** Placa em miniatura: o molde em public/formatura-placa, escalado para a largura do cartão. */
function Placa({ dados, titulo }: { dados: object; titulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [esc, setEsc] = useState(0.15);
  useEffect(() => {
    const el = caixa.current; if (!el) return;
    const ro = new ResizeObserver(() => setEsc(el.clientWidth / 2400));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const src = "/formatura-placa/molde.html#" + encodeURIComponent(JSON.stringify(dados));
  return (
    <div ref={caixa} style={{ position: "relative", width: "100%", aspectRatio: "2400 / 1782", overflow: "hidden" }}>
      <iframe title={titulo} src={src} loading="lazy" scrolling="no"
        style={{ position: "absolute", left: 0, top: 0, width: 2400, height: 1782, border: 0, transform: `scale(${esc})`, transformOrigin: "0 0", pointerEvents: "none" }} />
    </div>
  );
}

function Campo({ chave, campo, rotulo, valor, dica, longo }: { chave: string; campo: keyof Textos; rotulo: string; valor: string; dica?: string; longo?: boolean }) {
  const [v, setV] = useState(valor);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");
  const salvo = useRef(valor);
  async function salvar() {
    if (v.trim() === salvo.current.trim()) return;
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
        ? <textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} onBlur={salvar} style={{ ...estilo, resize: "vertical" }} />
        : <input value={v} onChange={(e) => setV(e.target.value)} onBlur={salvar} style={estilo} />}
      {dica && <span style={{ fontSize: 13, color: C.suave }}>{dica}</span>}
    </label>
  );
}

type Sugestao = { url: string; atual: boolean };

function FotoTurma({ chave, turma, url, aoMudar, sugestoes: s0 = [] }: { chave: string; turma: "a" | "b"; url: string; aoMudar: (u: string) => void; sugestoes?: Sugestao[] }) {
  const [estado, setEstado] = useState("");
  const [sugestoes, setSugestoes] = useState(s0);
  const [ver, setVer] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
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
      <div style={{ aspectRatio: "1052 / 372", borderRadius: 8, overflow: "hidden", background: "#0A2350", display: "flex", alignItems: "center", justifyContent: "center", color: C.suave, fontSize: 14 }}>
        {url ? <img src={url} alt={`Foto da turma ${turma.toUpperCase()}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "sem foto ainda"}
      </div>
      {listaSug}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()}
        style={{ minHeight: 44, borderRadius: 10, border: 0, background: C.ouro, color: "#14213D", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
        {sugestoes.length ? "Enviar outra foto da turma" : url ? "Trocar a foto da turma" : "Enviar a foto da turma"}
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

export function PainelPlacas({ chave, foco, criancas: inicial, textos: t0, fotoTurma: ft0, sugestoes }: { chave: string; foco: string | null; criancas: Crianca[]; textos: Textos; fotoTurma: { a: string; b: string }; sugestoes?: { a: Sugestao[]; b: Sugestao[] } }) {
  const [criancas, setCriancas] = useState(inicial);
  const [textos, setTextos] = useState(t0);
  const [fotoTurma, setFotoTurma] = useState(ft0);
  const [filtro, setFiltro] = useState<"todas" | "escolher" | "sem" | "aprovadas">("todas");
  const [grande, setGrande] = useState<string | null>(null);

  useEffect(() => {
    const f = (e: Event) => { const { campo, valor } = (e as CustomEvent).detail; setTextos((x) => ({ ...x, [campo]: valor })); };
    window.addEventListener("placa:texto", f); return () => window.removeEventListener("placa:texto", f);
  }, []);

  const porTurma = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of criancas) (m[c.turma] ??= []).push(c.nome);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return m;
  }, [criancas]);

  const dadosDe = (c: Crianca) => {
    const b = c.turma.endsWith("B");
    return {
      turma: c.turma, alunos: porTurma[c.turma] ?? [], homenageado: c.nome,
      fotoBeca: c.beca[c.escolhaBeca] ?? "", fotoFamilia: c.familia[c.escolhaFamilia] ?? "", fotoTurma: b ? fotoTurma.b : fotoTurma.a,
      oradora: textos.oradora, juramentista: textos.juramentista, professora: b ? textos.professora_b : textos.professora_a, demais: textos.demais,
    };
  };

  // sem a foto de beca não há placa; sem a da família a placa sai com o espaço vazio e um aviso (observacao)
  const semFotos = (c: Crianca) => !c.beca.length;
  const precisaEscolher = (c: Crianca) => !semFotos(c) && (c.beca.length > 1 || c.familia.length > 1) && !c.aprovada;
  const visiveis = criancas.filter((c) => filtro === "todas" ? true : filtro === "escolher" ? precisaEscolher(c) : filtro === "sem" ? semFotos(c) : c.aprovada);
  const contar = { todas: criancas.length, escolher: criancas.filter(precisaEscolher).length, sem: criancas.filter(semFotos).length, aprovadas: criancas.filter((c) => c.aprovada).length };

  async function mudar(nome: string, m: { beca?: number; familia?: number; aprovada?: boolean }) {
    setCriancas((l) => l.map((c) => c.nome !== nome ? c : { ...c, ...(m.beca !== undefined && { escolhaBeca: m.beca }), ...(m.familia !== undefined && { escolhaFamilia: m.familia }), ...(m.aprovada !== undefined && { aprovada: m.aprovada }) }));
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
        <div style={{ borderRadius: 12, overflow: "hidden" }}><Placa dados={dadosDe(so)} titulo={`Placa de ${so.nome}`} /></div>
        {semFotos(so) && <div style={{ fontSize: 16, color: "#FFC98A" }}>As fotos desta criança ainda não chegaram no Drive.</div>}
        {so.observacao && !semFotos(so) && <div style={{ fontSize: 16, color: C.suave }}>{so.observacao}</div>}
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <Opcoes titulo="Foto de beca" fotos={so.beca} escolha={so.escolhaBeca} aoEscolher={(i) => mudar(so.nome, { beca: i })} />
          <Opcoes titulo="Foto com a família" fotos={so.familia} escolha={so.escolhaFamilia} aoEscolher={(i) => mudar(so.nome, { familia: i })} />
        </div>
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
          </div>
          <Campo chave={chave} campo="demais" rotulo="E demais professores" valor={textos.demais} longo dica="Separe os nomes com vírgula." />
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 18, background: C.painel, border: `1px solid ${C.borda}` }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 28, fontWeight: 600 }}>2. Foto de cada turma</h2>
          <p style={{ margin: 0, color: C.suave }}>A foto da turma com as professoras. Pode ser tirada do celular, na maior qualidade.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FotoTurma chave={chave} turma="a" sugestoes={sugestoes?.a} url={fotoTurma.a} aoMudar={(u) => setFotoTurma((x) => ({ ...x, a: u }))} />
            <FotoTurma chave={chave} turma="b" sugestoes={sugestoes?.b} url={fotoTurma.b} aoMudar={(u) => setFotoTurma((x) => ({ ...x, b: u }))} />
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
