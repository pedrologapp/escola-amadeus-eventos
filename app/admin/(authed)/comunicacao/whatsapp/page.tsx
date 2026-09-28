import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
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
    db.from("whatsapp_conversas").select("*").eq("status", "aguardando").eq("ultima_da_escola", false),
    db.from("whatsapp_conversas").select("*").in("status", ["resolvida", "ignorada", "respondida"]).gte("atualizado_em", semana).order("atualizado_em", { ascending: false }).limit(50),
    db.from("whatsapp_eventos").select("assunto").eq("da_escola", false).gte("em", semana),
  ]);
  const cont = new Map<string, number>();
  for (const e of eventos ?? []) if (e.assunto) cont.set(e.assunto, (cont.get(e.assunto) ?? 0) + 1);

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Comunicação
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">WhatsApp da escola</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="size-4" /> O sistema só lê e organiza. Mensagem só sai quando alguém da equipe escreve e clica em enviar.
      </p>
      <PainelWhatsApp
        aguardando={(aguardando ?? []) as Conversa[]}
        fechadas={(fechadas ?? []) as Conversa[]}
        assuntos={[...cont.entries()].sort((a, b) => b[1] - a[1])}
        geradoEm={geradoEm}
      />
    </div>
  );
}
