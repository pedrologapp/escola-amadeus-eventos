import { Frame, PenLine, Smartphone } from "lucide-react";
import { ModuloCard, type Modulo } from "@/components/admin/modulo-card";

/**
 * Gerador de Imagens (29/09/2026): reúne as artes que a escola cria no
 * sistema — encarte (informa), painel de decoração (decora o evento) e moldura para stories.
 */
export const metadata = { title: "Gerador de Imagens · Admin Amadeus" };

const MODULOS: Modulo[] = [
  {
    href: "/admin/eventos/encarte",
    icone: PenLine,
    titulo: "Encarte",
    descricao: "Aviso, comunicado ou convite para WhatsApp, Instagram ou impressão. Você escreve e a IA organiza no estilo caderno da escola.",
  },
  {
    href: "/admin/eventos/painel",
    icone: Frame,
    titulo: "Painel de decoração",
    descricao: "Arte grande para decorar o evento (entrada, palco, pátio), em qualquer medida, com PDF no tamanho real para a gráfica.",
    selo: "Novo",
  },
  {
    href: "/admin/imagens/moldura",
    icone: Smartphone,
    titulo: "Moldura para stories",
    descricao: "Moldura do evento para o Instagram, com o meio transparente para a foto, ou o story já pronto com a foto.",
    selo: "Novo",
  },
];

export default function ImagensPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Gerador de Imagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha o que você quer criar.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((m) => (
          <ModuloCard key={m.href} m={m} />
        ))}
      </div>
    </div>
  );
}
