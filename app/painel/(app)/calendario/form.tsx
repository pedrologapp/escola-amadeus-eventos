"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { adicionarItem, removerItem } from "./actions";

const campo = "mt-1 w-full rounded-lg border border-[#e8e1d0] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B3B7C]";

export function NovoItem({ tipos, tipoInicial, dataInicial }: { tipos: { valor: string; rotulo: string }[]; tipoInicial: string; dataInicial: string }) {
  const [estado, acao, salvando] = useActionState(adicionarItem, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) form.current?.reset(); }, [estado]);
  return (
    <form ref={form} action={acao} className="space-y-2.5">
      <label className="block text-xs font-semibold">O que vai acontecer<input name="titulo" required placeholder="Ex.: Gravação na sala do 4º ano" className={campo} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">Dia<input name="data" type="date" required defaultValue={dataInicial} className={campo} /></label>
        <label className="block text-xs font-semibold">Até <span className="font-normal">(se durar mais)</span><input name="ate" type="date" className={campo} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">Tipo
          <select name="tipo" defaultValue={tipoInicial} className={campo}>{tipos.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}</select>
        </label>
        <label className="block text-xs font-semibold">Hora <span className="font-normal">(opcional)</span><input name="hora" placeholder="14h" className={campo} /></label>
      </div>
      <label className="block text-xs font-semibold">Quem é o responsável<input name="responsavel" placeholder="Ex.: Luana · Comunicação" className={campo} /></label>
      <label className="block text-xs font-semibold">Observação <span className="font-normal">(opcional)</span><input name="observacao" placeholder="Ex.: avisar a professora" className={campo} /></label>
      {estado?.erro && <p className="text-sm font-semibold text-red-700">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm font-semibold text-[#1f8a5b]">Salvo no calendário.</p>}
      <button type="submit" disabled={salvando} className="w-full rounded-lg bg-[#1B3B7C] px-3.5 py-2 text-sm font-bold text-white disabled:opacity-60">{salvando ? "Salvando…" : "Adicionar ao calendário"}</button>
    </form>
  );
}

export function Remover({ id }: { id: string }) {
  const [tirando, iniciar] = useTransition();
  return (
    <button type="button" disabled={tirando} onClick={() => iniciar(() => removerItem(id))} className="text-xs font-semibold text-[#9b2c22] opacity-70 hover:opacity-100" title="Tirar do calendário">
      {tirando ? "…" : "tirar"}
    </button>
  );
}
