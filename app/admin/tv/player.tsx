"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cena, RoteiroTv } from "@/lib/tv";
import "./tv.css";

/**
 * O que passa na TV: as cenas do roteiro uma depois da outra; no fim da
 * volta pede o roteiro de novo ao servidor (router.refresh), então aviso novo,
 * aniversariante do dia ou evento que mudou entram na volta seguinte.
 */

type D = Record<string, unknown>;
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const CORES = ["#F2549A", "#FFC21C", "#2E8FF0", "#4CC23A", "#FF8A1C", "#7B5EA7"];

const hojeLocal = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const diasAte = (iso: string) => Math.max(0, Math.round((new Date(`${iso}T00:00:00`).getTime() - hojeLocal().getTime()) / 864e5));
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

/** Palavras que entram uma a uma; *trecho* sai no destaque. */
function Palavras({ texto, d0 = 0.3, passo = 0.22, classeDest = "l3d", classeComum = "l3d azul" }: { texto: string; d0?: number; passo?: number; classeDest?: string; classeComum?: string }) {
  let n = 0;
  return (
    <>
      {texto.split(/(\*[^*]+\*)/).filter(Boolean).map((parte, i) => {
        const dest = parte.startsWith("*") && parte.endsWith("*");
        const t = dest ? parte.slice(1, -1) : parte;
        return (
          <span key={i} className={dest ? classeDest : classeComum} style={{ fontSize: dest ? "1em" : "0.62em" }}>
            {t.trim().split(/\s+/).filter(Boolean).map((p, j) => (
              <Fragment key={j}><span className="p" style={{ "--d": d0 + passo * n++ } as React.CSSProperties}>{p}</span>{" "}</Fragment>
            ))}{" "}
          </span>
        );
      })}
    </>
  );
}

function Destaque({ texto }: { texto: string }) {
  return <>{texto.split(/(\*[^*]+\*)/).filter(Boolean).map((p, i) => (p.startsWith("*") && p.endsWith("*") ? <b key={i}>{p.slice(1, -1)}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** Desenho em traço do sistema, que se desenha sozinho. */
const cacheSvg = new Map<string, Promise<string>>();
function Traco({ nome, className }: { nome: string; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let p = cacheSvg.get(nome);
    if (!p) {
      p = fetch(`/paineis/cenas/${nome}.svg`).then((r) => r.text());
      cacheSvg.set(nome, p);
    }
    let vivo = true;
    p.then((svg) => {
      const el = ref.current;
      if (!vivo || !el) return;
      el.innerHTML = svg.replace(/width="\d+" height="\d+" /, 'width="100%" ');
      const els = el.querySelectorAll<SVGGeometryElement>("path, circle, ellipse, rect, line, polyline, polygon");
      els.forEach((e, i) => {
        let L = 1000;
        try { L = Math.ceil(e.getTotalLength()) + 2; } catch {}
        e.style.setProperty("--L", String(L));
        e.style.setProperty("--t", `${(0.6 + i * (4.5 / els.length)).toFixed(2)}s`);
      });
    }).catch(() => null);
    return () => { vivo = false; };
  }, [nome]);
  return <div ref={ref} className={`desenho traco ${className}`} />;
}

const Onda = ({ s }: { s: React.CSSProperties }) => <div className="onda" style={s} />;
const Peca = ({ n, s, d }: { n: number; s: React.CSSProperties; d: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className="pula" src={`/marca/pecas/ativo-${n}.webp`} alt="" style={{ position: "absolute", ...s, "--d": d } as React.CSSProperties} />
);
const st = (d: number) => ({ "--d": d }) as React.CSSProperties;

function conteudo(c: Cena, hora: number) {
  const d = c.dados as D;
  switch (c.id) {
    case "saudacao": {
      const com = d.comemoracao as { titulo: string; icone: string | null } | null;
      const [a, b] = hora < 12 ? ["Bom", "dia,"] : hora < 18 ? ["Boa", "tarde,"] : ["Boa", "noite,"];
      const h = hojeLocal();
      return (
        <>
          <Onda s={{ width: 700, height: 500, left: -260, top: -240 }} />
          <Onda s={{ width: 800, height: 520, right: -300, bottom: -200 }} />
          <Peca n={38} s={{ right: 220, top: 90, width: 230 }} d={1.4} />
          <Peca n={23} s={{ left: 170, bottom: 190, width: 150 }} d={1.8} />
          <Peca n={22} s={{ right: 170, bottom: 230, width: 210 }} d={2.1} />
          <div className="titulo" style={{ top: com ? 170 : 250 }}>
            <div className="l3d" style={{ fontSize: 210 }}><span className="p" style={st(0.2)}>{a}</span> <span className="p" style={st(0.45)}>{b}</span></div>
            <div className="l3d azul" style={{ fontSize: 170 }}><span className="p" style={st(0.8)}>Amadeus!</span></div>
            <div className="sub surge" style={{ ...st(1.6), marginTop: 40 }}>{DIAS[h.getDay()]}, {h.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</div>
            {com && (
              <div className="surge" style={st(2.4)}>
                <div className="comemora">{com.icone && <span className="coracao">{com.icone}</span>} Hoje é <span>{com.titulo}</span></div>
              </div>
            )}
          </div>
        </>
      );
    }
    case "aniversariantes": {
      const lista = d.lista as { nome: string; turma: string; quando: string | null }[];
      const muitos = lista.length > 3;
      return (
        <>
          <div className="pauta" /><div className="margem" />
          <h2 className="surge" style={st(0.2)}>Parabéns, <span>aniversariantes!</span></h2>
          <div className="cards" style={muitos ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, top: 320 } : undefined}>
            {lista.map((p, i) => (
              <div key={i} className="card pula" style={{ ...st(1 + i * 0.4), ...(muitos ? { padding: "18px 30px 18px 18px" } : {}) }}>
                <div className="bolo" style={muitos ? { width: 90, height: 90, fontSize: 52 } : undefined}>{["🎂", "🎈", "🎉", "🎁"][i % 4]}</div>
                <div>
                  <b style={muitos ? { fontSize: 54 } : undefined}>{p.nome}</b>
                  <small style={muitos ? { fontSize: 28 } : undefined}>{p.turma}{p.quando ? ` · fez no ${p.quando}` : ""}</small>
                </div>
              </div>
            ))}
          </div>
          {!muitos && <Traco nome="criancas" className="" />}
          {[[1250, 0, 9, 1], [1450, 1, 11, 0.3], [1650, 2, 10, 2], [1100, 3, 12, 3]].map(([l, cor, dur, del], i) => (
            <div key={i} className="balao" style={{ left: l, background: CORES[cor], animationDuration: `${dur}s`, animationDelay: `${del}s` }} />
          ))}
          <Confete />
        </>
      );
    }
    case "avisos":
      return (
        <>
          <Onda s={{ width: 700, height: 500, left: -260, top: -240 }} />
          <Onda s={{ width: 760, height: 500, right: -300, bottom: -180 }} />
          <div className="quadro">
            <div className="rot surge" style={st(0.2)}>AVISO</div>
            {d.icone ? <div className="icone">{String(d.icone)}</div> : null}
            <div className="l3d"><Palavras texto={`*${String(d.titulo)}*`} d0={0.6} /></div>
            {d.texto ? <div className="texto surge" style={st(1.8)}><Destaque texto={String(d.texto)} /></div> : null}
          </div>
        </>
      );
    case "recados": {
      const lista = d.lista as { texto: string; icone: string | null }[];
      return (
        <div className="card surge" style={st(0)}>
          <h2 className="surge" style={st(0.3)}>Recados da <span>coordenação</span></h2>
          <ul>
            {lista.map((r, i) => (
              <li key={i} className="surge" style={st(1 + i * 0.8)}><i>{r.icone || "📌"}</i><span><Destaque texto={r.texto} /></span></li>
            ))}
          </ul>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lapis pula" src="/marca/pecas/ativo-23.webp" alt="" style={st(1 + lista.length * 0.8)} />
        </div>
      );
    }
    case "evento": {
      const falta = diasAte(String(d.data));
      const nome = String(d.nome);
      return (
        <>
          {d.ilustracao ? <div className="ilus" style={{ backgroundImage: `url(${String(d.ilustracao)})` }} /> : null}
          {!d.ilustracao && d.capa ? (
            <div className="capa surge" style={st(1.2)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(d.capa)} alt="" />
            </div>
          ) : null}
          <div className="txt">
            <div className="l3d azul pre"><span className="p" style={st(0.8)}>vem</span> <span className="p" style={st(1)}>aí:</span></div>
            <div className="l3d dest" style={{ fontSize: nome.length > 22 ? 118 : 150 }}>
              {nome.split(/\s+/).map((p, i) => <Fragment key={i}><span className="p" style={st(1.3 + i * 0.2)}>{p}</span>{" "}</Fragment>)}
            </div>
            <div className="etq surge" style={st(2.8)}>{dataLonga(String(d.data))}</div>
            {d.local ? <div className="local-txt surge" style={st(3.2)}>📍 {String(d.local)}</div> : null}
            <div className="falta surge" style={st(3.6)}>{falta === 0 ? <b>é hoje!</b> : falta === 1 ? <b>é amanhã!</b> : <>faltam <b>{falta}</b> dias</>}</div>
          </div>
        </>
      );
    }
    case "promo": {
      const falta = diasAte(String(d.prazo));
      return (
        <div className="card surge" style={st(0)}>
          <div className="rot surge" style={st(0.5)}>MATRÍCULAS 2027</div>
          <h2><span className="p" style={st(0.8)}>Matrícula</span> <span className="p" style={st(1.1)}><em>antecipada</em></span> <span className="p" style={st(1.4)}>tem</span> <span className="p" style={st(1.6)}>condição</span> <span className="p" style={st(1.8)}>especial!</span></h2>
          <p className="surge" style={st(2.4)}>Mensalidade com desconto e material mais barato para quem garante a vaga até <b>{dataLonga(String(d.prazo))}</b>.</p>
          <div className="prazo surge" style={st(3.2)}>{falta === 0 ? <>é o <b>último</b> dia!</> : <>faltam <b>{falta}</b> dias</>}</div>
          <div className="qr surge" style={st(2.8)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.qr) }} /><p>Aponte a câmera<br />e veja o folder 2027</p></div>
        </div>
      );
    }
    case "agenda": {
      const dias = d.dias as { data: string; itens: string[] }[];
      const hoje = hojeLocal();
      const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      const NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
      return (
        <>
          <h2 className="surge" style={st(0.2)}>Agenda da <span>semana</span></h2>
          <div className="semana">
            {dias.map((dia, i) => (
              <div key={dia.data} className={`dia surge ${dia.data === hojeIso ? "hoje" : ""}`} style={st(0.8 + i * 0.35)}>
                <header>{NOMES[i]}<small>{dia.data.slice(8)}/{dia.data.slice(5, 7)}{dia.data === hojeIso ? " · hoje" : ""}</small></header>
                <ul>{dia.itens.length ? dia.itens.map((t, j) => <li key={j} style={{ "--c": CORES[(i + j) % CORES.length] } as React.CSSProperties}>{t}</li>) : <li className="vazio">—</li>}</ul>
              </div>
            ))}
          </div>
        </>
      );
    }
    case "sabia":
      return (
        <>
          <div className="bolha surge" style={st(0.2)}>
            <h2 className="l3d azul"><span className="p" style={st(0.5)}>Você</span> <span className="p" style={st(0.8)}>sabia?</span></h2>
            <p className="surge" style={st(1.6)}><Destaque texto={String(d.texto)} /></p>
          </div>
          <div className="cor pula" style={st(2.2)}>💡</div>
        </>
      );
    case "frase": {
      const t = String(d.texto);
      const tam = t.length < 34 ? 150 : t.length < 52 ? 124 : 100;
      return (
        <>
          <Onda s={{ width: 600, height: 420, right: -220, top: -200 }} />
          <Onda s={{ width: 640, height: 420, left: -260, bottom: -160 }} />
          <Peca n={27} s={{ left: 180, top: 160, width: 190 }} d={3} />
          <Peca n={18} s={{ right: 210, bottom: 220, width: 200 }} d={3.3} />
          <div style={{ position: "absolute", inset: "0 240px 84px", display: "flex", flexWrap: "wrap", alignItems: "center", alignContent: "center", justifyContent: "center", textAlign: "center", fontSize: tam, lineHeight: 1.2 }}>
            <Palavras texto={t} />
          </div>
        </>
      );
    }
    case "qr":
      return (
        <>
          <h2 className="l3d"><span className="p" style={st(0.2)}>Para</span> <span className="p" style={st(0.4)}>os</span> <span className="p" style={st(0.6)}>pais</span></h2>
          <div className="sub surge" style={st(1)}>aponte a câmera do celular</div>
          <div className="lista">
            <div className="item pula" style={st(1.5)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.folder) }} /><b>Folder 2027</b><small>tudo sobre o próximo ano</small></div>
            <div className="item pula" style={st(2)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.pesquisa) }} /><b>Sua opinião</b><small>pesquisa de satisfação</small></div>
          </div>
        </>
      );
    case "formatura":
      return (
        <>
          <Estrelas />
          <svg className="rastro" viewBox="0 0 1920 1080" fill="none">
            <mask id="tv-rastro"><path className="cobre" d="M-80 680 C 300 600, 600 520, 820 500 S 1200 640, 1420 600 S 1900 280, 2300 240" stroke="#fff" strokeWidth="12" /></mask>
            <path mask="url(#tv-rastro)" d="M-80 680 C 300 600, 600 520, 820 500 S 1200 640, 1420 600 S 1900 280, 2300 240" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
          </svg>
          <svg className="aviao" viewBox="0 0 220 120" fill="none" strokeLinejoin="round">
            <path d="M8 70 L210 12 L120 112 L100 78 Z" fill="#fff" stroke="#083078" strokeWidth="5" />
            <path d="M100 78 L210 12 L70 66" fill="#DCE8FB" stroke="#083078" strokeWidth="5" />
            <path d="M100 78 L96 100 L120 112" fill="#B9CCEF" stroke="#083078" strokeWidth="5" />
          </svg>
          <div className="txt">
            <div className="pre surge" style={st(0.4)}>o voo mais bonito do ano</div>
            <div className="l3d dest"><span className="p" style={st(0.9)}>Formatura</span></div>
            <div className="l3d azul ano"><span className="p" style={st(1.4)}>5º</span> <span className="p" style={st(1.6)}>ano</span> <span className="p" style={st(1.8)}>2026</span></div>
          </div>
          <Traco nome="formatura" className="" />
        </>
      );
    case "fim":
      return (
        <div className="centro">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/folder/marca-30-anos.png" alt="" />
          <div className="fr surge" style={st(1.2)}>30 anos educando para a vida</div>
        </div>
      );
    default:
      return null;
  }
}

// posições sorteadas uma vez (fora do render, para o React não reclamar)
const ESTRELAS = Array.from({ length: 70 }, (_, i) => ({ l: (i * 277) % 1920, t: (i * 131) % 560, s: 0.5 + ((i * 37) % 14) / 10 }));
const CONFETE = Array.from({ length: 40 }, (_, i) => ({ l: (i * 211) % 1920, dur: 4 + ((i * 7) % 50) / 10, del: -((i * 13) % 80) / 10 }));
const Estrelas = () => <div>{ESTRELAS.map((e, i) => <i key={i} className="estrela" style={{ left: e.l, top: e.t, transform: `scale(${e.s})` }} />)}</div>;
const Confete = () => <div>{CONFETE.map((c, i) => <i key={i} className="confete" style={{ left: c.l, background: CORES[i % CORES.length], animationDuration: `${c.dur}s`, animationDelay: `${c.del}s` }} />)}</div>;

const CLASSE: Record<string, string> = {
  saudacao: "cena-saudacao doodles",
  aniversariantes: "cena-aniversariantes",
  avisos: "cena-aviso doodles",
  recados: "cena-recados doodles",
  evento: "cena-evento",
  promo: "cena-promo doodles",
  agenda: "cena-agenda",
  sabia: "cena-sabia doodles",
  frase: "cena-frase doodles",
  qr: "cena-qr doodles",
  formatura: "cena-formatura",
  fim: "cena-fim",
};

/** embutida: dentro de uma caixa numa página (o portal); clicar abre em tela cheia. */
export function PlayerTv({ roteiro, previa, congelada = null, embutida = false }: { roteiro: RoteiroTv; previa: boolean; congelada?: { cena: number; t: number } | null; embutida?: boolean }) {
  const router = useRouter();
  const cenas = roteiro.cenas;
  // congelada (?cena=3&t=5): para na cena 3 no segundo 5, para conferir
  const [atual, setAtual] = useState(congelada ? Math.min(congelada.cena, Math.max(0, cenas.length - 1)) : 0);
  const [saindo, setSaindo] = useState<number | null>(null);
  const [agora, setAgora] = useState<Date | null>(null);
  const [escala, setEscala] = useState(0);
  const [cheia, setCheia] = useState(false);
  const inicio = useRef(0);
  const raiz = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const total = useMemo(() => cenas.reduce((s, c) => s + c.segundos, 0), [cenas]);
  const antes = useMemo(() => cenas.slice(0, atual).reduce((s, c) => s + c.segundos, 0), [cenas, atual]);

  // o palco de 1920x1080 encolhe para caber na tela (ou na caixa, quando embutida)
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const ajusta = () => setEscala(Math.min(el.clientWidth / 1920, el.clientHeight / 1080));
    ajusta();
    const ro = new ResizeObserver(ajusta);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const tique = () => setAgora(new Date());
    tique();
    const t = setInterval(tique, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!congelada) return;
    const r = setTimeout(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = congelada.t * 1000; }), 300);
    return () => clearTimeout(r);
  }, [congelada, atual]);

  // anda o roteiro; no fim da volta pede o roteiro novo
  useEffect(() => {
    if (!cenas.length || congelada) return;
    inicio.current = performance.now();
    const c = cenas[Math.min(atual, cenas.length - 1)];
    const t = setTimeout(() => {
      setSaindo(atual);
      setTimeout(() => setSaindo(null), 900);
      if (atual + 1 >= cenas.length) {
        router.refresh();
        setAtual(0);
      } else setAtual(atual + 1);
    }, c.segundos * 1000);
    return () => clearTimeout(t);
  }, [atual, cenas, router, congelada]);

  useEffect(() => {
    let raf = 0;
    const anda = () => {
      if (barra.current && total) barra.current.style.width = `${Math.min(1, (antes + (performance.now() - inicio.current) / 1000) / total) * 100}%`;
      raf = requestAnimationFrame(anda);
    };
    raf = requestAnimationFrame(anda);
    return () => cancelAnimationFrame(raf);
  }, [antes, total]);

  const hora = agora?.getHours() ?? 8;
  const dataRodape = agora ? `${DIAS[agora.getDay()]}, ${agora.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}` : "";

  return (
    <div
      ref={raiz}
      className={`tv-tela ${cheia ? "cheia" : ""} ${previa ? "previa" : ""} ${embutida ? "embutida" : ""}`}
      onClick={() => {
        if (previa) return;
        const alvo = embutida ? raiz.current : document.documentElement;
        alvo?.requestFullscreen?.().then(() => setCheia(!embutida)).catch(() => null);
      }}
    >
      {escala > 0 && (
        <div id="palco" style={{ left: "50%", top: "50%", transformOrigin: "center", transform: `translate(-50%, -50%) scale(${escala})` }}>
          {cenas.map((c, i) => (
            <section key={`${roteiro.atualizado}:${c.chave}`} className={`cena ${CLASSE[c.id] ?? ""} ${c.id === "evento" && !(c.dados as D).ilustracao ? "sem-ilus doodles" : ""} ${i === atual ? "on" : ""} ${i === saindo ? "sai" : ""}`}>
              {(i === atual || i === saindo) && conteudo(c, hora)}
            </section>
          ))}
          <div id="progresso" ref={barra} />
          <footer id="rodape">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-amadeus-negativa.png" alt="Centro Educacional Amadeus" />
            <span className="data">{dataRodape}</span>
            <span className="hora">{agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
          </footer>
        </div>
      )}
    </div>
  );
}
