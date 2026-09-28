import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarContatos, chaveTelefone, type Contato } from "@/lib/whatsapp-contatos";
import { PainelWhatsApp, type Conversa } from "./painel";

/**
 * Painel do WhatsApp da escola: quem está esperando resposta, uma linha por
 * conversa, e a resposta manual (texto e arquivo) enviada pela equipe.
 * O sistema nunca responde sozinho. Leitura: lib/whatsapp-monitor.
 */
export const metadata = { title: "WhatsApp · Admin Amadeus" };
export const dynamic = "force-dynamic";

const agora = () => Date.now();

export default async function WhatsAppPage() {
  const db = createAdminClient();
  const geradoEm = agora();
  const semana = new Date(geradoEm - 7 * 864e5).toISOString();
  const [{ data: aguardando }, { data: fechadas }, { data: eventos }] = await Promise.all([
    // Fica na lista até alguém marcar "Resolvido", mesmo depois de respondida.
    db.from("whatsapp_conversas").select("*").eq("status", "aguardando"),
    db.from("whatsapp_conversas").select("*").in("status", ["resolvida", "ignorada"]).gte("atualizado_em", semana).order("atualizado_em", { ascending: false }).limit(50),
    db.from("whatsapp_eventos").select("assunto").eq("da_escola", false).gte("em", semana),
  ]);
  const contatos: Contato[] = await carregarContatos().catch(() => []);
  const vinculo = new Map(contatos.map((c) => [chaveTelefone(c.telefone), c]));
  const comVinculo = (l: Conversa[]) =>
    l.map((c) => {
      const v = vinculo.get(chaveTelefone(c.telefone));
      return { ...c, vinculo: v?.vinculo ?? null, nome_cadastro: v?.nome ?? null };
    });
  const cont = new Map<string, number>();
  for (const e of eventos ?? []) if (e.assunto) cont.set(e.assunto, (cont.get(e.assunto) ?? 0) + 1);

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Comunicação
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-2xl font-extrabold text-amadeus-blue">WhatsApp da escola</h1>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
          title="O sistema só lê e organiza. Mensagem só sai quando alguém da equipe escreve e clica em enviar."
        >
          <ShieldCheck className="size-3.5" /> Nada é enviado sozinho
        </span>
      </div>
      <PainelWhatsApp
        aguardando={comVinculo((aguardando ?? []) as Conversa[])}
        fechadas={comVinculo((fechadas ?? []) as Conversa[])}
        contatos={contatos}
        assuntos={[...cont.entries()].sort((a, b) => b[1] - a[1])}
        geradoEm={geradoEm}
      />
    </div>
  );
}
