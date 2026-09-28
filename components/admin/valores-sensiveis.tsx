"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { liberarValores, ocultarValores } from "@/app/admin/valores-actions";

/**
 * Valores sensíveis do admin (receitas, cobranças, ingressos vendidos).
 * Ficam TRANCADOS até alguém digitar a senha (direção, 28/09/2026): sem
 * ela, o servidor nem manda os valores para a página (lib/valores-auth).
 * O olhinho do topo pede a senha para liberar e tranca de novo.
 */
const Ctx = createContext<{ mostrar: boolean; pedir: () => void }>({ mostrar: false, pedir: () => {} });

function DialogoSenha({ fechar }: { fechar: () => void }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const confirmar = () =>
    iniciar(async () => {
      const r = await liberarValores(senha);
      if (!r.ok) return setErro(r.erro ?? "Senha incorreta.");
      fechar();
      router.refresh();
    });
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onClick={fechar}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="flex items-center gap-2 font-bold text-amadeus-blue"><Lock className="size-4" /> Ver valores</p>
        <p className="mt-1 text-sm text-muted-foreground">Digite a senha para ver cobranças e valores dos eventos. Fica liberado por 8 horas neste computador.</p>
        <input
          autoFocus
          type="password"
          value={senha}
          onChange={(e) => { setSenha(e.target.value); setErro(null); }}
          onKeyDown={(e) => e.key === "Enter" && senha && confirmar()}
          className="mt-4 w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-amadeus-blue"
          placeholder="Senha"
        />
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={fechar} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
          <button type="button" disabled={!senha || pendente} onClick={confirmar} className="inline-flex items-center gap-2 rounded-lg bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pendente && <Loader2 className="size-4 animate-spin" />} Liberar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ValoresSensiveisProvider({ liberado = false, children }: { liberado?: boolean; children: React.ReactNode }) {
  const [dialogo, setDialogo] = useState(false);
  return (
    <Ctx.Provider value={{ mostrar: liberado, pedir: () => setDialogo(true) }}>
      {children}
      {dialogo && <DialogoSenha fechar={() => setDialogo(false)} />}
    </Ctx.Provider>
  );
}

export function useValoresSensiveis() {
  return useContext(Ctx);
}

function useAlternar() {
  const { mostrar, pedir } = useValoresSensiveis();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const alternar = () => {
    if (!mostrar) return pedir();
    iniciar(async () => { await ocultarValores(); router.refresh(); });
  };
  return { mostrar, alternar, pendente };
}

/** Botão do topo do admin: pede a senha para mostrar; tranca de novo. */
export function OlhinhoGlobal() {
  const { mostrar, alternar, pendente } = useAlternar();
  return (
    <button
      type="button"
      onClick={alternar}
      title={mostrar ? "Trancar os valores de novo" : "Mostrar valores (pede senha)"}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
    >
      {pendente ? <Loader2 className="size-4 animate-spin" /> : mostrar ? <EyeOff className="size-4" /> : <Lock className="size-4" />}
      <span className="hidden lg:inline">{mostrar ? "Ocultar valores" : "Mostrar valores"}</span>
    </button>
  );
}

/** Botão compacto só com o ícone (para usar perto dos valores). */
export function OlhinhoIcone() {
  const { mostrar, alternar } = useAlternar();
  return (
    <button
      type="button"
      onClick={alternar}
      title={mostrar ? "Ocultar valores" : "Mostrar valores (pede senha)"}
      className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
    >
      {mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

/**
 * Mostra o valor quando liberado; senão, a máscara (clicar pede a senha).
 * O servidor já manda `null` quando está trancado — o valor não vai no HTML.
 */
export function ValorSensivel({ valor, moeda = true }: { valor: string | null; moeda?: boolean }) {
  const { mostrar, pedir } = useValoresSensiveis();
  if (mostrar && valor) return <>{valor}</>;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); pedir(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pedir(); }}
      title="Clique e digite a senha para ver"
      className="cursor-pointer select-none underline decoration-dotted underline-offset-4"
    >
      {moeda ? "R$ ••••" : "••••"}
    </span>
  );
}
