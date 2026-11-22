import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALUNO_TESTE, listarTurma, type AlunoNono } from "@/lib/homenagem-9ano";
import { BUCKET_HOMENAGEM, URL_HOMENAGEM, type StatusParte } from "@/lib/homenagem-9ano-texto";
import { PainelHomenagem, type EnvioAdmin } from "./painel";

/**
 * Homenagem do 9º ano (formatura 2026): quem da turma já mandou, os vídeos de cada família para
 * assistir e aprovar (ou pedir para gravar de novo), as fotos e os links para baixar tudo.
 */
export const metadata = { title: "Homenagem do 9º ano · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function HomenagemAdmin() {
  const db = createAdminClient();
  let turma: AlunoNono[] = [];
  let erro: string | null = null;
  try {
    turma = await listarTurma();
  } catch (e) {
    erro = `Não consegui ler a turma do Activesoft (${(e as Error).message}).`;
  }
  const { data } = await db
    .from("homenagem_9ano_envios")
    .select("id, aluno_id, aluno_nome, quem, parte1, parte2, fotos, status1, status2, observacao1, observacao2, criado_em, atualizado_em")
    .order("criado_em");
  const linhas = data ?? [];
  const { data: tent } = await db
    .from("homenagem_9ano_tentativas")
    .select("id, criado_em, resultado, aluno_id, aluno_nome, termo, data_digitada, aparelho")
    .order("criado_em", { ascending: false })
    .limit(150);
  const tentativas = (tent ?? []) as Tentativa[];

  const caminhos = linhas.flatMap((l) => [l.parte1, l.parte2, ...((l.fotos as string[]) ?? [])]).filter(Boolean) as string[];
  const ver = new Map<string, string>();
  const baixar = new Map<string, string>();
  if (caminhos.length) {
    const [a, b] = await Promise.all([
      db.storage.from(BUCKET_HOMENAGEM).createSignedUrls(caminhos, 60 * 60 * 8),
      db.storage.from(BUCKET_HOMENAGEM).createSignedUrls(caminhos, 60 * 60 * 8, { download: true }),
    ]);
    for (const s of a.data ?? []) if (s.path && s.signedUrl) ver.set(s.path, s.signedUrl);
    for (const s of b.data ?? []) if (s.path && s.signedUrl) baixar.set(s.path, s.signedUrl);
  }
  const arq = (p: string | null) => (p ? { ver: ver.get(p) ?? null, baixar: baixar.get(p) ?? null, ext: p.split(".").pop() ?? "mp4" } : null);

  const envios: EnvioAdmin[] = linhas.map((l) => ({
    id: l.id,
    alunoId: l.aluno_id,
    aluno: l.aluno_nome,
    quem: l.quem,
    parte1: arq(l.parte1),
    parte2: arq(l.parte2),
    status1: l.status1 as StatusParte,
    status2: l.status2 as StatusParte,
    observacao1: l.observacao1,
    observacao2: l.observacao2,
    fotos: ((l.fotos as string[]) ?? []).map((p) => arq(p)!).filter(Boolean),
    quando: l.atualizado_em,
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Homenagem do 9º ano</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        As famílias gravam a mensagem (parte 1) e o poema (parte 2). Assista, aprove ou peça para gravar de novo: o pedido aparece para a família na página dela.
      </p>
      <Link href="/admin/homenagem-9ano/envio" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#1F8F4E] px-4 text-sm font-bold text-white">Convite da homenagem surpresa (26/11): enviar pelo seu WhatsApp</Link>
      {erro && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>}
      <PainelHomenagem link={URL_HOMENAGEM} turma={turma.filter((a) => a.id !== ALUNO_TESTE.id).map((a) => ({ id: a.id, nome: a.nome }))} envios={envios} />
      <Tentativas lista={tentativas} />
    </div>
  );
}

interface Tentativa {
  id: number;
  criado_em: string;
  resultado: "entrou" | "data_errada" | "nome_nao_achado" | "erro";
  aluno_id: number | null;
  aluno_nome: string | null;
  termo: string | null;
  data_digitada: string | null;
  aparelho: string | null;
}

const quandoFoi = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const ROTULO: Record<Tentativa["resultado"], { txt: string; cor: string }> = {
  entrou: { txt: "Entrou", cor: "bg-emerald-100 text-emerald-800" },
  data_errada: { txt: "Data não conferiu", cor: "bg-red-100 text-red-800" },
  nome_nao_achado: { txt: "Nome não achado", cor: "bg-amber-100 text-amber-900" },
  erro: { txt: "Erro do sistema", cor: "bg-zinc-200 text-zinc-800" },
};

/**
 * Tentativas de entrada na página dos pais: quem entrou, quem errou a data de nascimento (com a data
 * digitada, para a escola orientar) e o que foi buscado sem achar aluno. Serve para descobrir quem está travando.
 */
function Tentativas({ lista }: { lista: Tentativa[] }) {
  const reais = lista.filter((t) => t.aluno_id !== ALUNO_TESTE.id);
  const entraram = new Set(reais.filter((t) => t.resultado === "entrou").map((t) => t.aluno_id));
  // família que errou a data e (ainda) não conseguiu entrar: é quem precisa de ajuda
  const travadas = new Map<number, Tentativa>();
  for (const t of reais) if (t.resultado === "data_errada" && t.aluno_id && !entraram.has(t.aluno_id) && !travadas.has(t.aluno_id)) travadas.set(t.aluno_id, t);
  return (
    <section className="mt-10">
      <h2 className="text-lg font-extrabold text-amadeus-blue">Tentativas de entrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Quem abriu a página e tentou entrar. Use para descobrir quem está travando (registro a partir de 22/11).
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Famílias que entraram</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{entraram.size}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Erraram a data e não entraram</p>
          <p className="mt-1 text-3xl font-extrabold text-red-700">{travadas.size}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Buscas sem achar aluno</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{reais.filter((t) => t.resultado === "nome_nao_achado").length}</p>
        </div>
      </div>
      {travadas.size > 0 && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-900">Precisam de ajuda (a data digitada não bate com a do Activesoft):</p>
          <ul className="mt-2 space-y-1 text-sm text-red-900">
            {[...travadas.values()].map((t) => (
              <li key={t.id}>{t.aluno_nome ?? `Aluno ${t.aluno_id}`}: digitou {t.data_digitada ?? "?"} ({quandoFoi(t.criado_em)})</li>
            ))}
          </ul>
        </div>
      )}
      {lista.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma tentativa ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Aluno / busca</th><th className="px-3 py-2">Data digitada</th><th className="px-3 py-2">Aparelho</th></tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id} className="border-t border-border/50">
                  <td className="whitespace-nowrap px-3 py-2">{quandoFoi(t.criado_em)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROTULO[t.resultado].cor}`}>{ROTULO[t.resultado].txt}</span></td>
                  <td className="px-3 py-2">{t.resultado === "nome_nao_achado" ? <i>&quot;{t.termo}&quot;</i> : t.aluno_nome ?? "—"}{t.aluno_id === ALUNO_TESTE.id && <span className="ml-1 text-xs text-muted-foreground">(teste)</span>}</td>
                  <td className="px-3 py-2">{t.data_digitada ?? ""}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.aparelho ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
