import { createAdminClient } from "@/lib/supabase/admin";
import { limparTelefone } from "@/lib/experiencia";
import { AbasRematricula } from "../abas";
import { PainelExperiencia, type Candidato, type ContatoExp } from "./painel";

/**
 * Experiência Amadeus (sáb 10/10, 14h): enviar o encarte pelo WhatsApp da escola, guardar todo mundo
 * que recebeu (lista de contatos para lembrar e não perder o contato) e o lembrete da véspera.
 */
export const metadata = { title: "Experiência Amadeus · Admin Amadeus" };
export const dynamic = "force-dynamic";
export const maxDuration = 300; // envio em lote tem pausa entre um número e outro

// O WhatsApp entrega o mesmo celular com e sem o 9 (8487905400 e 84987905400): mostra uma linha só, a com o 9,
// completando o que faltar (nome, criança, respostas) com a outra.
const semNome = (n: string | null | undefined) => !n || /escola|amadeus/i.test(n);
function juntarRepetidos(lista: ContatoExp[]): ContatoExp[] {
  const porTel = new Map(lista.map((c) => [c.telefone, c]));
  const fica: ContatoExp[] = [];
  for (const c of lista) {
    if (c.telefone.length === 10 && porTel.has(c.telefone.slice(0, 2) + "9" + c.telefone.slice(2))) continue;
    const g = c.telefone.length === 11 ? porTel.get(c.telefone.slice(0, 2) + c.telefone.slice(3)) : undefined;
    if (!g) { fica.push(c); continue; }
    const j: ContatoExp = { ...c };
    for (const k of ["crianca", "serie", "convite_em", "lembrete_em", "vai_em", "vai_texto", "pessoas", "nao_vai_em", "resposta_texto", "pedido_confirmacao_em"] as const)
      if (j[k] == null && g[k] != null) (j as unknown as Record<string, unknown>)[k] = g[k];
    if (semNome(j.responsavel) && !semNome(g.responsavel)) j.responsavel = g.responsavel;
    j.lembrar = c.lembrar || g.lembrar;
    j.conferir = c.conferir || g.conferir;
    if (g.criado_em < j.criado_em) j.criado_em = g.criado_em;
    fica.push(j);
  }
  return fica;
}

export default async function ExperienciaPage() {
  const admin = createAdminClient();
  const [contatos, config, envios, novatos] = await Promise.all([
    admin.from("experiencia_contatos").select("*").order("criado_em", { ascending: false }),
    admin.from("experiencia_config").select("lembrete_automatico").eq("id", 1).single(),
    admin.from("experiencia_envios").select("telefone, tipo, status, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("rematricula_envios").select("aluno_nome, serie_2027, responsavel, telefone, created_at").is("aluno_id", null).eq("status", "enviado").order("created_at", { ascending: false }),
  ]);

  const lista = juntarRepetidos((contatos.data ?? []) as ContatoExp[]);
  const naLista = new Set((contatos.data ?? []).map((c) => c.telefone as string));
  // Último erro por número (para mostrar "sem WhatsApp"/"erro" quando o encarte não chegou).
  const ultimoConvite = new Map<string, string>();
  for (const e of envios.data ?? []) if (e.tipo === "convite" && !ultimoConvite.has(e.telefone)) ultimoConvite.set(e.telefone, e.status);

  // Novatos que já receberam a carta/folder da rematrícula e ainda não estão na lista.
  const candidatos: Candidato[] = [];
  for (const n of novatos.data ?? []) {
    const telefone = limparTelefone(n.telefone);
    if (naLista.has(telefone) || candidatos.some((c) => c.telefone === telefone)) continue;
    const semNome = n.aluno_nome === "(só o folder)";
    candidatos.push({ telefone, responsavel: n.responsavel, crianca: semNome ? null : n.aluno_nome, serie: n.serie_2027 === "—" ? null : n.serie_2027, quando: n.created_at });
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="experiencia" />
      <p className="mt-4 text-sm text-muted-foreground">
        Experiência Amadeus · <b className="text-amadeus-blue">sábado, 10/10, às 14h</b>. Quem recebe o encarte fica guardado aqui, com nome e número, para o
        lembrete da véspera e para a escola não perder o contato.
      </p>
      <PainelExperiencia
        contatos={lista.map((c) => ({ ...c, ultimo: ultimoConvite.get(c.telefone) ?? null }))}
        candidatos={candidatos}
        automatico={config.data?.lembrete_automatico ?? true}
      />
    </div>
  );
}
