"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Aluno = { id: number; nome: string; turma: string };
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CHAVE = "painel:recentes"; // os últimos alunos abertos, só neste navegador

/** Busca por nome: escolheu, a página recarrega com ?aluno= e o servidor calcula os valores. */
export function BuscaRematricula({ alunos }: { alunos: Aluno[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState("");
  const [carregando, iniciar] = useTransition();
  const [recentes, setRecentes] = useState<Aluno[]>([]);

  useEffect(() => {
    try { setRecentes(JSON.parse(localStorage.getItem(CHAVE) ?? "[]")); } catch { /* sem localStorage */ }
  }, []);

  const achados = useMemo(() => {
    const q = semAcento(busca.trim());
    if (q.length < 2) return [];
    const partes = q.split(/\s+/);
    return alunos.filter((a) => partes.every((p) => semAcento(a.nome).includes(p))).slice(0, 7);
  }, [busca, alunos]);

  const escolher = (a: Aluno) => {
    setBusca("");
    const novos = [a, ...recentes.filter((r) => r.id !== a.id)].slice(0, 4);
    setRecentes(novos);
    try { localStorage.setItem(CHAVE, JSON.stringify(novos)); } catch { /* sem localStorage */ }
    iniciar(() => router.push(`/painel?aluno=${a.id}`));
  };
  const atual = Number(params.get("aluno"));

  return (
    <div className="mt-3">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && achados[0]) escolher(achados[0]); }}
        placeholder={alunos.length ? "Nome do aluno" : "Activesoft fora do ar: tente de novo em instantes"}
        disabled={!alunos.length}
        className="w-full rounded-xl bg-white px-4 py-3.5 text-lg text-[#1A2240] outline-none ring-4 ring-[#FFC21C]/45"
        autoComplete="off"
      />
      {achados.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl bg-white text-sm text-[#1A2240]">
          {achados.map((a, i) => (
            <li key={a.id}>
              <button type="button" onClick={() => escolher(a)} className={`flex w-full justify-between px-4 py-2.5 text-left hover:bg-[#eef2fa] ${i === 0 ? "font-bold" : ""}`}>
                {a.nome} <small className="font-normal text-[#5b6478]">{a.turma}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busca.trim().length >= 2 && !achados.length && <p className="mt-2 text-sm opacity-80">Nenhum aluno ativo com esse nome.</p>}
      {carregando && <p className="mt-2 text-sm opacity-80">Abrindo…</p>}
      {recentes.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] opacity-90">
          Abertos há pouco:
          {recentes.map((r) => (
            <button key={r.id} type="button" onClick={() => escolher(r)} className={`rounded-full px-2.5 py-0.5 ${r.id === atual ? "bg-white text-[#1B3B7C]" : "bg-white/15 hover:bg-white/25"}`}>
              {r.nome.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}
