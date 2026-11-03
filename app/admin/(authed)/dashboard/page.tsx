import { serifa } from "@/lib/fonte-serifa";
import { Hoje } from "@/app/painel/(app)/hoje";

/**
 * Visão geral do admin.eventos: (02/11/2026, Pedro) a mesma tela "Hoje" do painel novo (admin.escolaamadeus.com),
 * com a rematrícula no centro e Matrícula, Comunicação + Calendário e Eventos embaixo.
 */
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  return (
    <div className={`${serifa.variable} bg-[#FBF7EE] text-[#1A2240]`}>
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <Hoje aluno={aluno} base="/admin/dashboard" />
      </div>
    </div>
  );
}
