"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cena, RoteiroTv } from "@/lib/tv";
import "./tv.css";

/**
 * O que passa na TV: as cenas do roteiro uma depois da outra; no fim da volta pede o roteiro de novo ao servidor
 * (router.refresh), então aviso novo, aniversariante do dia ou evento que mudou entram na volta seguinte.
 *
 * Visual novo (Pedro, 12/11/2026): fundo azul que respira, um ícone 3D por tela (public/tv/icones, gerados no
 * Higgsfield no estilo da abertura do Arboria), títulos em Lilita One, legenda em Caveat e o rodapé de TV
 * (logo da escola, faixa de notícias com as frases do gerenciador, dia e hora).
 */

type D = Record<string, unknown>;
const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const SEMANA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
/** Frase do rodapé quando a escola ainda não pôs nenhuma. */
const RODAPE_PADRAO = ["Centro Educacional Amadeus: 30 anos educando para a vida"];

const hojeLocal = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const diasAte = (iso: string) => Math.max(0, Math.round((new Date(`${iso}T00:00:00`).getTime() - hojeLocal().getTime()) / 864e5));
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
const st = (d: number) => ({ "--d": d }) as React.CSSProperties;

/** *trecho* sai em amarelo. */
function Destaque({ texto }: { texto: string }) {
  return <>{texto.split(/(\*[^*]+\*)/).filter(Boolean).map((p, i) => (p.startsWith("*") && p.endsWith("*") ? <b key={i}>{p.slice(1, -1)}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** Palavras que sobem uma a uma; *trecho* sai em amarelo. */
function Palavras({ texto, d0 = 0.4, passo = 0.2 }: { texto: string; d0?: number; passo?: number }) {
  let n = 0;
  return (
    <>
      {texto.split(/(\*[^*]+\*)/).filter(Boolean).map((parte, i) => {
        const dest = parte.startsWith("*") && parte.endsWith("*");
        return (
          <Fragment key={i}>
            {(dest ? parte.slice(1, -1) : parte).trim().split(/\s+/).filter(Boolean).map((p, j) => (
              <Fragment key={j}><span className={`p ${dest ? "dest" : ""}`} style={st(d0 + passo * n++)}>{p}</span>{" "}</Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

const Icone = ({ nome, d = 0.2 }: { nome: string; d?: number }) => (
  <div className={`icone3d icone-${nome}`} style={st(d)}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/tv/icones/${nome}.webp`} alt="" />
  </div>
);
/** manhã até 12h, tarde até 18h, noite depois */
const periodo = (hora: number) => (hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite");
/** a última palavra em amarelo (só uma palavra em destaque por título) */
const ultimaEmDestaque = (t: string) => {
  const p = t.trim().split(/\s+/);
  return p.length > 1 ? `${p.slice(0, -1).join(" ")} *${p[p.length - 1]}*` : `*${t.trim()}*`;
};

/** O layout "cartão": legenda à mão, título, frase e o ícone grande ao lado. */
function Cartao({ icone, legenda, titulo, texto, resposta }: { icone: string; legenda: string; titulo: string; texto?: string; resposta?: string }) {
  const alto = icone === "lampada";
  return (
    <div className={`cartao-tv ${titulo.length + (resposta?.length ?? 0) > 28 ? "longo" : ""} ${alto ? "icone-alto" : ""}`}>
      <div className="vidro surge" style={st(0)} />
      <Icone nome={icone} d={0.3} />
      <div className="txt">
        <div className="mao surge" style={st(0.3)}>{legenda}</div>
        <div className="t1"><Palavras texto={titulo} d0={0.6} /></div>
        {/* pergunta e resposta: a resposta aparece uns segundos depois, em amarelo */}
        {resposta ? <div className="t1 resposta"><Palavras texto={`*${resposta.replace(/\*/g, "")}*`} d0={3.2} /></div> : null}
        {texto ? <p className="t2 surge" style={st(1.8)}><Destaque texto={texto} /></p> : null}
      </div>
    </div>
  );
}

function ListaTv({ icone, titulo, children }: { icone: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="lista-tv">
      <Icone nome={icone} />
      <h2 className="t1"><Palavras texto={titulo} d0={0.2} /></h2>
      <ul>{children}</ul>
    </div>
  );
}

// posições sorteadas uma vez (fora do render, para o React não reclamar)
const ESTRELAS = Array.from({ length: 60 }, (_, i) => ({ l: (i * 277) % 1920, t: (i * 131) % 520, s: 0.5 + ((i * 37) % 14) / 10 }));

function conteudo(c: Cena, hora: number) {
  const d = c.dados as D;
  switch (c.id) {
    case "saudacao": {
      const com = d.comemoracao as { titulo: string; icone: string | null } | null;
      const oi = hora < 12 ? "Bom dia," : hora < 18 ? "Boa tarde," : "Boa noite,";
      const h = hojeLocal();
      return (
        <>
          <Icone nome={{ manha: "sol", tarde: "sol-tarde", noite: "lua" }[periodo(hora)]} />
          <div className="txt">
            <div className="t1"><Palavras texto={`${oi} *Amadeus!*`} d0={0.3} /></div>
            <p className="t2 surge" style={st(1.4)}>{DIAS[h.getDay()]}, {h.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</p>
            {com && <div className="selo-amarelo surge" style={st(2)}>{com.icone ? `${com.icone} ` : ""}Hoje é {com.titulo}</div>}
          </div>
        </>
      );
    }
    case "aniversariantes": {
      const lista = d.lista as { nome: string; turma: string; quando: string | null }[];
      return (
        <>
          <Icone nome="bolo" />
          <h2 className="t1"><Palavras texto="Feliz *aniversário!*" d0={0.2} /></h2>
          <div className="lista">
            {lista.map((p, i) => (
              <div key={i} className="pessoa surge" style={st(1 + i * 0.3)}>
                <b>{p.nome}</b>
                <small>{p.turma}{p.quando ? ` · fez no ${p.quando}` : ""}</small>
              </div>
            ))}
          </div>
        </>
      );
    }
    case "avisos":
      return <Cartao icone="megafone" legenda="atenção, famílias!" titulo={String(d.titulo)} texto={d.texto ? String(d.texto) : undefined} />;
    case "recados": {
      const lista = d.lista as { texto: string; icone: string | null }[];
      if (lista.length === 1) return <Cartao icone="caderno" legenda="lembrete rápido" titulo={lista[0].texto} />;
      return (
        <ListaTv icone="caderno" titulo="Recados da *coordenação*">
          {lista.map((r, i) => (
            <li key={i} className="surge" style={st(1 + i * 0.5)}><i>{r.icone || "📌"}</i><span><Destaque texto={r.texto} /></span></li>
          ))}
        </ListaTv>
      );
    }
    case "evento": {
      const falta = diasAte(String(d.data));
      const nome = String(d.nome);
      return (
        <div className={nome.length > 22 ? "longo" : ""}>
          {d.ilustracao ? <div className="ilus" style={{ backgroundImage: `url(${String(d.ilustracao)})` }} /> : null}
          <Icone nome="ingresso" />
          <div className="txt">
            <div className="mao surge" style={st(0.3)}>{falta <= 7 ? "marque na agenda!" : "vem aí"}</div>
            <div className="t1"><Palavras texto={ultimaEmDestaque(nome)} d0={0.6} /></div>
            <p className="quando surge" style={st(1.6)}>{dataLonga(String(d.data))}</p>
            {d.local ? <p className="onde surge" style={st(1.9)}>{String(d.local)}</p> : null}
            <div className="selo-amarelo surge" style={st(2.3)}>{falta === 0 ? "É hoje!" : falta === 1 ? "É amanhã!" : `Faltam ${falta} dias`}</div>
          </div>
        </div>
      );
    }
    case "promo": {
      const falta = diasAte(String(d.prazo));
      return (
        <>
          <div className="txt">
            <div className="mao surge" style={st(0.3)}>matrículas 2027</div>
            <div className="t1"><Palavras texto="Matrícula *antecipada* tem condição especial!" d0={0.6} /></div>
            <p className="t2 surge" style={st(1.8)}>Desconto para quem garante a vaga até <b>{dataLonga(String(d.prazo))}</b>.</p>
            <div className="selo-amarelo surge" style={st(2.3)}>{falta === 0 ? "É o último dia!" : `Faltam ${falta} dias`}</div>
          </div>
          <div className="qr surge" style={st(1.2)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.qr) }} /><p>Aponte a câmera e veja o folder</p></div>
        </>
      );
    }
    case "agenda": {
      const dias = d.dias as { data: string; itens: string[] }[];
      const hoje = hojeLocal();
      const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      return (
        <>
          <Icone nome="calendario" />
          <h2 className="t1"><Palavras texto="Agenda da *semana*" d0={0.2} /></h2>
          <div className="dias">
            {dias.map((dia, i) => (
              <div key={dia.data} className={`dia surge ${dia.data === hojeIso ? "hoje" : dia.data < hojeIso ? "passou" : ""}`} style={st(0.9 + i * 0.15)}>
                <b>{SEMANA[i]}</b>
                <small>{dia.data.slice(8)}/{dia.data.slice(5, 7)}{dia.data === hojeIso ? " · hoje" : ""}</small>
                {dia.itens.length > 0 && <ul>{dia.itens.map((t, j) => <li key={j}>{t}</li>)}</ul>}
              </div>
            ))}
          </div>
        </>
      );
    }
    case "sabia": {
      // "pergunta? resposta": a TV mostra a pergunta e, logo depois, a resposta
      const t = String(d.texto);
      const q = t.indexOf("?");
      const pergunta = q > 0 && t.slice(q + 1).trim() ? t.slice(0, q + 1) : t;
      const resposta = pergunta !== t ? t.slice(q + 1).trim() : undefined;
      return <Cartao icone="lampada" legenda={d.evento ? "hoje na escola" : "você sabia?"} titulo={pergunta} resposta={resposta} />;
    }
    case "frase": {
      const t = String(d.texto);
      const tam = t.length < 34 ? 150 : t.length < 60 ? 124 : 100;
      return (
        <>
          <Icone nome="balao" />
          <div className="txt"><div className="t1" style={{ fontSize: tam }}><Palavras texto={t} d0={0.5} /></div></div>
        </>
      );
    }
    case "qr":
      return (
        <>
          <Icone nome="celular" />
          <div className="txt">
            <h2 className="t1"><Palavras texto="Para os *pais*" d0={0.2} /></h2>
            <p className="t2 surge" style={st(0.9)}>Aponte a câmera do celular</p>
          </div>
          <div className="codigos">
            <div className="codigo surge" style={st(1.3)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.folder) }} /><div><b>Folder 2027</b><small>tudo sobre o próximo ano</small></div></div>
            <div className="codigo surge" style={st(1.7)}><div className="caixa" dangerouslySetInnerHTML={{ __html: String(d.pesquisa) }} /><div><b>Sua opinião</b><small>pesquisa de satisfação</small></div></div>
          </div>
        </>
      );
    case "formatura":
      return (
        <>
          <div>{ESTRELAS.map((e, i) => <i key={i} className="estrela" style={{ left: e.l, top: e.t, transform: `scale(${e.s})` }} />)}</div>
          <Icone nome="capelo" />
          <div className="txt">
            <div className="mao surge" style={st(0.4)}>{String(d.pre ?? "o voo mais bonito do ano")}</div>
            <div className="t1"><Palavras texto={String(d.titulo ?? "Formatura")} d0={0.8} /></div>
            {d.linha ? <div className="linha"><Palavras texto={ultimaEmDestaque(String(d.linha))} d0={1.3} /></div> : null}
          </div>
        </>
      );
    case "fim":
      return (
        <div className="centro">
          <div className="t1"><Palavras texto="Até daqui a *pouco!*" d0={0.2} /></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="surge" style={st(1.2)} src="/tv/logo-horizontal.png" alt="Centro Educacional Amadeus" />
          <div className="mao surge" style={st(1.8)}>30 anos educando para a vida</div>
        </div>
      );
    case "tela": {
      // telas criadas pela escola: cada formato usa o desenho de uma cena pronta
      const f = String(d.formato);
      if (f === "aviso") return conteudo({ ...c, id: "avisos" }, hora);
      if (f === "recado") {
        const lista = ((d.linhas as { icone?: string; texto: string }[] | undefined) ?? []).filter((l) => l.texto).slice(0, 4).map((l) => ({ texto: l.texto, icone: l.icone || null }));
        return conteudo({ ...c, id: "recados", dados: { lista } }, hora);
      }
      if (f === "frase") return conteudo({ ...c, id: "frase" }, hora);
      if (f === "sabia") return conteudo({ ...c, id: "sabia" }, hora);
      if (f === "celebracao") return conteudo({ ...c, id: "formatura" }, hora);
      if (f === "programacao") {
        const linhas = ((d.linhas as { hora: string; texto: string }[] | undefined) ?? []).filter((l) => l.hora || l.texto);
        return (
          <ListaTv icone="relogio" titulo={String(d.titulo || "Programação")}>
            {linhas.slice(0, 5).map((l, i) => (
              <li key={i} className="surge" style={st(1 + i * 0.4)}><i className="hora">{l.hora}</i><span><Destaque texto={l.texto} /></span></li>
            ))}
          </ListaTv>
        );
      }
      return null;
    }
    default:
      return null;
  }
}

const CLASSE: Record<string, string> = {
  saudacao: "cena-saudacao",
  aniversariantes: "cena-aniversariantes",
  avisos: "cena-aviso",
  recados: "cena-recados",
  evento: "cena-evento",
  promo: "cena-promo",
  agenda: "cena-agenda",
  sabia: "cena-sabia",
  frase: "cena-frase",
  qr: "cena-qr",
  formatura: "cena-celebracao",
  fim: "cena-fim",
  "tela-aviso": "cena-aviso",
  "tela-recado": "cena-recados",
  "tela-frase": "cena-frase",
  "tela-sabia": "cena-sabia",
  "tela-celebracao": "cena-celebracao",
  "tela-programacao": "cena-programacao",
};

/** A faixa de notícias do rodapé: as frases passam da direita para a esquerda, sem parar. */
function Faixa({ frases }: { frases: string[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const lista = frases.length ? frases : RODAPE_PADRAO;
  useLayoutEffect(() => {
    const el = trilho.current;
    if (el) el.style.animationDuration = `${Math.max(12, el.scrollWidth / 2 / 140)}s`; // ~140 px por segundo
  }, [lista.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="faixa">
      <div className="trilho" ref={trilho}>
        {[...lista, ...lista].map((f, i) => <span key={i}>{f}</span>)}
      </div>
    </div>
  );
}

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

  // sem nenhuma cena (banco estava fora do ar): pede o roteiro de novo a cada minuto
  useEffect(() => {
    if (cenas.length || congelada) return;
    const t = setInterval(() => router.refresh(), 60000);
    return () => clearInterval(t);
  }, [cenas.length, router, congelada]);

  // anda o roteiro; no fim da volta pede o roteiro novo
  useEffect(() => {
    if (!cenas.length || congelada) return;
    inicio.current = performance.now();
    const c = cenas[Math.min(atual, cenas.length - 1)];
    const t = setTimeout(() => {
      setSaindo(atual);
      setTimeout(() => setSaindo(null), 1100);
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
        <div id="palco" className={`periodo-${periodo(hora)}`} style={{ left: "50%", top: "50%", transformOrigin: "center", transform: `translate(-50%, -50%) scale(${escala})` }}>
          <div className="tv-luz" />
          {periodo(hora) === "noite" && <div className="tv-estrelas">{ESTRELAS.map((e, i) => <i key={i} style={{ left: e.l, top: e.t, transform: `scale(${e.s})` }} />)}</div>}
          {cenas.map((c, i) => (
            <section key={`${roteiro.atualizado}:${c.chave}`} className={`cena ${CLASSE[c.id === "tela" ? `tela-${String((c.dados as D).formato)}` : c.id] ?? ""} ${i === atual ? "on" : ""} ${i === saindo ? "sai" : ""}`}>
              {(i === atual || i === saindo) && conteudo(c, hora)}
            </section>
          ))}
          <div className="tv-grao" />
          <div id="progresso" ref={barra} />
          <footer id="rodape">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="logo"><img src="/tv/logo-horizontal.png" alt="Centro Educacional Amadeus" /></div>
            <Faixa frases={roteiro.rodape ?? []} />
            <div className="quando">
              <div className="hoje-txt">
                <b>{agora ? DIAS[agora.getDay()] : ""}</b>
                <small>{agora ? agora.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : ""}</small>
              </div>
              <div className="hora">{agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
