import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AbasRematricula } from "../../abas";
import { PainelReenvio, type LinhaReenvio } from "./painel";

/**
 * Experiência Amadeus · reenvio do convite para o sábado 24/10 pela API oficial (YCloud), com "Eu vou" / "Não vou".
 * O Pedro valida aqui quem recebe e ele mesmo aperta o botão de enviar; as respostas aparecem na mesma tabela.
 */
export const metadata = { title: "Reenvio 24/10 · Experiência Amadeus · Admin Amadeus" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function ReenvioPage() {
  const { data } = await createAdminClient()
    .from("experiencia_contatos")
    .select("telefone, responsavel, crianca, serie, origem, vai_em, matriculou_em, veio_1010, observacao, enviar_2410, convite_2410_em, convite_2410_status, resposta_2410, resposta_2410_em, pessoas_2410")
    .order("responsavel", { ascending: true });
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="experiencia" />
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/admin/rematricula-2027/experiencia" className="font-semibold text-amadeus-blue hover:underline">← Experiência Amadeus</Link>
        {" · "}Reenvio do convite para <b className="text-amadeus-blue">sábado, 24/10, às 14h</b>, pelo WhatsApp oficial (YCloud), com os botões <b>Eu vou</b> e <b>Não vou</b>.
        Marque quem recebe; nada sai até você apertar <b>Enviar</b>. Quem toca <b>Eu vou</b> é perguntado quantas pessoas vêm e lembrado de trazer a criança.
      </p>
      <PainelReenvio linhas={(data ?? []) as LinhaReenvio[]} />
    </div>
  );
}
