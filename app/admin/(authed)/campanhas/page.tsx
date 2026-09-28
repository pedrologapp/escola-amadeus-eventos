import {
  Baby,
  ClipboardList,
  GraduationCap,
  Heart,
} from "lucide-react";
import { ModuloCard, type Modulo } from "@/components/admin/modulo-card";

/**
 * Hub das campanhas: ações com começo e fim. As em andamento ficam em cima;
 * as encerradas descem para um bloco apagado, mas continuam abrindo (o
 * histórico e os relatórios seguem valendo).
 *
 * Substitui o antigo /admin/diversos (que agora redireciona para cá).
 * Para encerrar uma campanha, mova o cartão de EM_ANDAMENTO para ENCERRADAS.
 */
export const metadata = { title: "Campanhas · Admin Amadeus" };

// A Rematrícula 2027 tem aba própria no menu (/admin/rematricula-2027).
const EM_ANDAMENTO: Modulo[] = [
  {
    href: "/admin/fotos-infancia",
    icone: Baby,
    titulo: "Fotos de infância",
    descricao: "Cada colaborador envia uma foto de quando era criança. Veja quem já mandou e quem falta.",
    selo: "Em andamento",
  },
];

const ENCERRADAS: Modulo[] = [
  {
    href: "/admin/matriculas2027",
    icone: GraduationCap,
    titulo: "Matrículas 2027",
    descricao: "Confirmações de presença da reunião de abertura das matrículas (26/09/2026).",
    selo: "Encerrada",
  },
  {
    href: "/admin/reuniao",
    icone: ClipboardList,
    titulo: "Reunião de Rematrículas",
    descricao: "Cronograma do dia, materiais e checklist da reunião de 26/09/2026.",
    selo: "Encerrada",
  },
  {
    href: "/admin/dia-dos-pais",
    icone: Heart,
    titulo: "Dia dos Pais",
    descricao: "Vídeos dos alunos, cards impressos com QR e a folha de impressão (agosto de 2026).",
    selo: "Encerrada",
  },
];

export default function CampanhasPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Campanhas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ações da escola com começo e fim: inscrições, eventos especiais e pedidos.
      </p>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">Em andamento</h2>
      {EM_ANDAMENTO.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma campanha em andamento.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EM_ANDAMENTO.map((m) => (
            <ModuloCard key={m.href} m={m} />
          ))}
        </div>
      )}

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Encerradas</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ENCERRADAS.map((m) => (
          <ModuloCard key={m.href} m={m} apagado />
        ))}
      </div>
    </div>
  );
}
