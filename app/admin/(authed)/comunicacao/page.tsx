import { Cake, MessageSquareHeart } from "lucide-react";
import { ModuloCard, type Modulo } from "@/components/admin/modulo-card";

/**
 * Hub do que conversa com famílias e equipe no dia a dia: mensagens
 * automáticas e pesquisas.
 */
export const metadata = { title: "Comunicação · Admin Amadeus" };

const MODULOS: Modulo[] = [
  {
    href: "/admin/comunicacao/aniversarios",
    icone: Cake,
    titulo: "Aniversários",
    descricao: "Aniversariantes de hoje e dos próximos dias, e se o cartão foi enviado no WhatsApp.",
    selo: "Automático · 7h",
  },
  {
    href: "/admin/enquete",
    icone: MessageSquareHeart,
    titulo: "Pesquisas",
    descricao: "Respostas das pesquisas de clima e de satisfação das famílias.",
  },
];

export default function ComunicacaoPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Comunicação</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mensagens automáticas e pesquisas com as famílias e a equipe.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((m) => (
          <ModuloCard key={m.href} m={m} />
        ))}
      </div>
    </div>
  );
}
