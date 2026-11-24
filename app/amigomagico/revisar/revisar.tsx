"use client";

import { useEffect, useState } from "react";
import { confirmar, listaRevisao, type CriancaRevisao } from "./actions";

/**
 * Revisar amigos: a professora escolhe a turma e, por criança, vê o adesivo do amigo, o que ele é e o nome dele num
 * campo que ela pode corrigir; "Está certo" marca como conferido (com o nome dela e a hora). Gael (sem amigo ainda) e
 * Jamily (amigo sem nome) aparecem com o aviso do que falta.
 */

type Turma = "A" | "B";
const FUSO = "America/Fortaleza";
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const CHAVE_QUEM = "amigomagico:quem";

export function Revisar() {
  const [turma, setTurma] = useState<Turma>("A");
  const [quem, setQuem] = useState("");
  const [lista, setLista] = useState<CriancaRevisao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    try {
      setQuem(localStorage.getItem(CHAVE_QUEM) ?? "");
    } catch {}
  }, []);
  useEffect(() => {
    let vivo = true;
    setLista(null);
    setErro(null);
    listaRevisao(turma).then((r) => {
      if (!vivo) return;
      if (r.ok) setLista(r.criancas);
      else setErro(r.erro);
    });
    return () => {
      vivo = false;
    };
  }, [turma]);
  const guardarQuem = (v: string) => {
    setQuem(v);
    try {
      localStorage.setItem(CHAVE_QUEM, v);
    } catch {}
  };
  const atualizar = (c: CriancaRevisao) => setLista((l) => (l ?? []).map((x) => (x.alunoId === c.alunoId ? c : x)));

  const comAmigo = lista?.filter((c) => c.amigo) ?? [];
  const conferidos = comAmigo.filter((c) => c.revisao?.conferido).length;

  return (
    <div className="dd-livro rv">
      <header className="dd-faixa">
        <a className="dd-voltar" href="/amigomagico" aria-label="Voltar ao menu">‹</a>
        <img className="dd-logo" src="/amigomagico/img/amadeus-horizontal.webp" alt="Centro Educacional Amadeus" width={560} height={139} />
        <span className="dd-faixa-t">Revisar amigos</span>
        <span className="dd-elastico" aria-hidden="true" />
      </header>
      <main className="rv-folha">
        <p className="rv-intro">Confira o amigo mágico de cada criança. Se o nome estiver errado, corrija. Depois toque em &quot;Está certo&quot;.</p>
        <label className="rv-quem">
          Seu nome
          <input value={quem} onChange={(e) => guardarQuem(e.target.value)} placeholder="ex.: Prof. Ana" autoComplete="name" />
        </label>
        <div className="rv-abas" role="tablist">
          {(["A", "B"] as Turma[]).map((t) => (
            <button key={t} role="tab" aria-selected={turma === t} className={turma === t ? "on" : ""} onClick={() => setTurma(t)}>
              Grupo V {t}
            </button>
          ))}
        </div>
        {lista && <p className="rv-conta">{conferidos} de {comAmigo.length} conferidos</p>}
        {erro && <p className="rv-erro">{erro}</p>}
        {!lista && !erro && <p className="rv-conta">abrindo a turma…</p>}
        <div className="rv-lista">
          {lista?.map((c) => (
            <Cartao key={c.alunoId} c={c} quem={quem} atualizar={atualizar} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Cartao({ c, quem, atualizar }: { c: CriancaRevisao; quem: string; atualizar: (c: CriancaRevisao) => void }) {
  const original = c.amigo?.amigo ?? "";
  const [nome, setNome] = useState(c.revisao?.nomeAmigo ?? original);
  const [obs, setObs] = useState(c.revisao?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mudou = c.revisao?.conferido && (nome !== (c.revisao.nomeAmigo ?? original) || obs !== (c.revisao.observacao ?? ""));

  if (!c.amigo) {
    return (
      <article className="rv-cartao falta">
        <div className="rv-sem">?</div>
        <div className="rv-txt">
          <b>{c.nome}</b>
          <p className="rv-aviso">Ainda não tem amigo mágico: falta o registro da atividade no Diário.</p>
        </div>
      </article>
    );
  }

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const r = await confirmar(c.alunoId, nome, obs, quem);
    setSalvando(false);
    if (r.ok) atualizar({ ...c, revisao: r.revisao });
    else setErro(r.erro);
  };

  return (
    <article className={`rv-cartao ${c.revisao?.conferido && !mudou ? "ok" : ""}`}>
      <img className="rv-adesivo" src={c.amigo.adesivo} alt="" />
      <div className="rv-txt">
        <b>{c.nome}</b>
        <small>Amigo: {c.amigo.tipo}</small>
        <label>
          Nome do amigo
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="O amigo ainda não tem nome" maxLength={40} />
        </label>
        {!original && !nome && <p className="rv-aviso">O amigo ainda não tem nome. Escreva o nome que a criança deu.</p>}
        {c.revisao?.nomeAmigo && <p className="rv-antes">Antes: {original || "sem nome"}</p>}
        <label>
          Algo mais para mudar? (opcional)
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} maxLength={400} placeholder='ex.: "é uma gata, não um gato"' />
        </label>
        {erro && <p className="rv-erro">{erro}</p>}
        {c.revisao?.conferido && !mudou ? (
          <p className="rv-feito">
            Conferido por {c.revisao.conferidoPor} em {quando(c.revisao.conferidoEm!)}
          </p>
        ) : (
          <button type="button" className="rv-certo" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : mudou ? "Salvar a correção" : "Está certo"}
          </button>
        )}
      </div>
    </article>
  );
}
