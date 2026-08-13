import Link from "next/link";
import { Heart, MessageSquareHeart, Shirt } from "lucide-react";

/**
 * Hub dos módulos pontuais.
 *
 * Eventos e Cobranças são o dia a dia da escola e ficam na barra. Enquete,
 * Fardamento e Dia dos Pais são campanhas com começo e fim — juntá-las
 * aqui devolve espaço à navegação (e cabe no celular).
 *
 * As rotas antigas continuam valendo: só saíram do menu, não do sistema.
 */
export const metadata = { title: "Diversos · Admin Amadeus" };

const MODULOS = [
  {
    href: "/admin/dia-dos-pais",
    icone: Heart,
    titulo: "Dia dos Pais",
    descricao:
      "Vídeos dos alunos, cards impressos com QR e a folha de impressão.",
  },
  {
    href: "/admin/enquete",
    icone: MessageSquareHeart,
    titulo: "Enquete",
    descricao: "Respostas da pesquisa de clima e satisfação das famílias.",
  },
  {
    href: "/admin/fardamento",
    icone: Shirt,
    titulo: "Fardamento",
    descricao: "Pedidos de fardamento dos colaboradores, com tamanhos.",
  },
];

export default function DiversosPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Diversos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Campanhas e módulos pontuais da escola.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((m) => {
          const Icone = m.icone;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group rounded-2xl border border-border/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-amadeus-blue/40 hover:shadow-lg"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-amadeus-blue-50 text-amadeus-blue transition-colors group-hover:bg-amadeus-blue group-hover:text-white">
                <Icone className="size-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-amadeus-blue">
                {m.titulo}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {m.descricao}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
