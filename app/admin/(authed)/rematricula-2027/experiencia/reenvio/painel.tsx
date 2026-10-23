"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { enviarReenvio, marcarEnvio, type ResultadoReenvio } from "./actions";

export interface LinhaReenvio {
  telefone: string;
  responsavel: string | null;
  crianca: string | null;
  serie: string | null;
  origem: string;
  vai_em: string | null;
  matriculou_em: string | null;
  veio_1010: boolean | null;
  observacao: string | null;
  enviar_2410: boolean | null;
  convite_2410_em: string | null;
  convite_2410_status: string | null;
  resposta_2410: "vai" | "nao_vai" | null;
  resposta_2410_em: string | null;
  pessoas_2410: number | null;
}

const fone = (t: string) => (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t);
const hora = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
type Filtro = "todos" | "recebe" | "nao_recebe" | "vai" | "nao_vai" | "sem_resposta";

export function PainelReenvio({ linhas }: { linhas: LinhaReenvio[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState<{ feitos: number; total: number } | null>(null);
  const [resultados, setResultados] = useState<ResultadoReenvio[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const recebe = linhas.filter((l) => l.enviar_2410);
  const aEnviar = recebe.filter((l) => !l.convite_2410_em);
  const vao = linhas.filter((l) => l.resposta_2410 === "vai");
  const pessoas = vao.reduce((s, l) => s + (l.pessoas_2410 ?? 0), 0);
  const naoVao = linhas.filter((l) => l.resposta_2410 === "nao_vai");
  const enviados = linhas.filter((l) => l.convite_2410_em);

  const vistas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (b && !`${l.responsavel ?? ""} ${l.crianca ?? ""} ${l.telefone}`.toLowerCase().includes(b)) return false;
      if (filtro === "recebe") return l.enviar_2410 === true;
      if (filtro === "nao_recebe") return l.enviar_2410 !== true;
      if (filtro === "vai") return l.resposta_2410 === "vai";
      if (filtro === "nao_vai") return l.resposta_2410 === "nao_vai";
      if (filtro === "sem_resposta") return !!l.convite_2410_em && !l.resposta_2410;
      return true;
    });
  }, [linhas, filtro, busca]);

  const marcar = (telefones: string[], valor: boolean | null) =>
    iniciar(async () => {
      const r = await marcarEnvio(telefones, valor);
      if (!r.ok) setErro(r.erro ?? "Não deu certo.");
      router.refresh();
    });

  async function enviar() {
    setConfirmando(false); setErro(null); setResultados([]);
    const tels = aEnviar.map((l) => l.telefone);
    setEnviando({ feitos: 0, total: tels.length });
    const todos: ResultadoReenvio[] = [];
    for (let i = 0; i < tels.length; i += 15) {
      const r = await enviarReenvio(tels.slice(i, i + 15));
      if (!r.ok) { setErro(r.erro ?? "Não deu certo."); break; }
      todos.push(...r.resultados);
      setEnviando({ feitos: Math.min(tels.length, i + 15), total: tels.length });
      setResultados([...todos]);
    }
    setEnviando(null);
    router.refresh();
  }

  const falhas = resultados.filter((r) => !r.ok);
  const chip = (id: Filtro, rotulo: string, n: number) => (
    <button key={id} onClick={() => setFiltro(id)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filtro === id ? "border-amadeus-blue bg-amadeus-blue text-white" : "border-border bg-white text-muted-foreground hover:text-amadeus-blue"}`}>
      {rotulo} · {n}
    </button>
  );

  return (
    <div className="mt-5 space-y-5">
      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-white p-4"><p className="text-xs text-muted-foreground">Marcados para receber</p><p className="text-2xl font-extrabold text-amadeus-blue">{recebe.length}</p><p className="text-xs text-muted-foreground">{aEnviar.length} ainda não enviados</p></div>
        <div className="rounded-2xl border border-border/60 bg-white p-4"><p className="text-xs text-muted-foreground">Enviados</p><p className="text-2xl font-extrabold text-amadeus-blue">{enviados.length}</p></div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4"><p className="text-xs text-muted-foreground">Vão (pelo botão)</p><p className="text-2xl font-extrabold text-emerald-700">{vao.length}</p><p className="text-xs text-muted-foreground">{pessoas} pessoas{vao.some((l) => !l.pessoas_2410) ? ` · ${vao.filter((l) => !l.pessoas_2410).length} sem dizer quantos` : ""}</p></div>
        <div className="rounded-2xl border border-red-200 bg-white p-4"><p className="text-xs text-muted-foreground">Não vão</p><p className="text-2xl font-extrabold text-red-700">{naoVao.length}</p></div>
      </section>

      <section className="rounded-2xl border-2 border-amadeus-blue/30 bg-white p-5">
        {enviando ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-amadeus-blue"><Loader2 className="size-4 animate-spin" /> Enviando… {enviando.feitos} de {enviando.total}</p>
        ) : confirmando ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">Enviar o convite de 24/10 agora para <b>{aEnviar.length}</b> {aEnviar.length === 1 ? "família" : "famílias"}?</p>
            <button onClick={enviar} className="rounded-lg bg-amadeus-blue px-4 py-2 text-sm font-bold text-white">Sim, enviar</button>
            <button onClick={() => setConfirmando(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
          </div>
        ) : (
          <button disabled={!aEnviar.length || pendente} onClick={() => setConfirmando(true)} className="inline-flex items-center gap-2 rounded-lg bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            <Send className="size-4" /> Enviar para os {aEnviar.length} marcados que ainda não receberam
          </button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Usa o modelo <b>experiencia_24_10</b> da YCloud: só funciona depois que a Meta aprovar. Quem já recebeu não recebe de novo.</p>
        {resultados.length ? <p className="mt-2 text-sm">{resultados.length - falhas.length} enviados{falhas.length ? <span className="text-red-700"> · {falhas.length} com erro: {falhas.slice(0, 3).map((f) => `${fone(f.telefone)} (${f.detalhe})`).join("; ")}</span> : null}</p> : null}
        {erro ? <p className="mt-2 text-sm text-red-700">{erro}</p> : null}
      </section>

      <section className="rounded-2xl border border-border/60 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          {chip("todos", "Todos", linhas.length)}
          {chip("recebe", "Recebem", recebe.length)}
          {chip("nao_recebe", "Não recebem", linhas.length - recebe.length)}
          {chip("vai", "Vão", vao.length)}
          {chip("nao_vai", "Não vão", naoVao.length)}
          {chip("sem_resposta", "Receberam e não responderam", enviados.filter((l) => !l.resposta_2410).length)}
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou número" className="ml-auto rounded-lg border px-3 py-1.5 text-sm" />
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          <button disabled={pendente} onClick={() => marcar(vistas.map((l) => l.telefone), true)} className="rounded border px-2 py-1 hover:bg-emerald-50">Marcar os {vistas.length} da lista como “recebe”</button>
          <button disabled={pendente} onClick={() => marcar(vistas.map((l) => l.telefone), false)} className="rounded border px-2 py-1 hover:bg-red-50">Marcar os {vistas.length} como “não recebe”</button>
          {pendente ? <Loader2 className="size-4 animate-spin text-amadeus-blue" /> : null}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Recebe?</th>
                <th className="py-2 pr-3">Família</th>
                <th className="py-2 pr-3">Número</th>
                <th className="py-2 pr-3">Antes</th>
                <th className="py-2 pr-3">Convite 24/10</th>
                <th className="py-2 pr-3">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {vistas.map((l) => (
                <tr key={l.telefone} className={`border-b border-border/40 ${l.enviar_2410 ? "" : "bg-slate-50 text-muted-foreground"}`}>
                  <td className="py-2 pr-2">
                    <input type="checkbox" className="size-4" checked={!!l.enviar_2410} disabled={pendente || !!l.convite_2410_em} onChange={(e) => marcar([l.telefone], e.target.checked)} />
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">{l.responsavel || "(sem nome)"}</p>
                    <p className="text-xs text-muted-foreground">{[l.crianca, l.serie].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{fone(l.telefone)}</td>
                  <td className="py-2 pr-3 text-xs">
                    {[l.vai_em ? `confirmou em ${hora(l.vai_em)}` : null, l.veio_1010 ? "veio em 10/10" : null, l.matriculou_em ? "matriculou" : null, l.observacao].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs">{l.convite_2410_em ? `enviado ${hora(l.convite_2410_em)}` : l.convite_2410_status ? <span className="text-red-700">{l.convite_2410_status}</span> : "—"}</td>
                  <td className="py-2 pr-3 text-xs">
                    {l.resposta_2410 === "vai" ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">Vai{l.pessoas_2410 ? ` · ${l.pessoas_2410} pessoas` : ""}</span> : l.resposta_2410 === "nao_vai" ? <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700">Não vai</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
