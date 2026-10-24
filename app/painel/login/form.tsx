"use client";

import { useActionState } from "react";
import { entrar } from "../actions";

const campo = "mt-1 w-full rounded-xl border border-[#e8e1d0] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <form action={acao} className="space-y-4">
      <label className="block text-sm font-semibold">
        E-mail
        <input name="email" type="email" autoComplete="email" required disabled={enviando} className={campo} />
      </label>
      <label className="block text-sm font-semibold">
        Senha
        <input name="senha" type="password" autoComplete="current-password" required disabled={enviando} className={campo} />
      </label>
      {estado?.erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
      <button type="submit" disabled={enviando} className="w-full rounded-xl bg-[#1B3B7C] px-4 py-2.5 font-bold text-white disabled:opacity-60">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
