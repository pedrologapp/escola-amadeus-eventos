import { CalendarPlus, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const metricas = [
  {
    titulo: "Eventos ativos",
    valor: "0",
    descricao: "Nenhum evento publicado ainda",
    icone: CalendarPlus,
  },
  {
    titulo: "Inscrições no mês",
    valor: "0",
    descricao: "Total de inscrições pagas",
    icone: Users,
  },
  {
    titulo: "Receita do mês",
    valor: "R$ 0,00",
    descricao: "Apenas pagamentos confirmados",
    icone: Wallet,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <Badge variant="accent">Admin</Badge>
          <Button variant="default" size="sm">
            <CalendarPlus />
            Novo evento
          </Button>
        </div>
      </header>

      {/* Métricas */}
      <section className="mt-10 grid gap-6 md:grid-cols-3">
        {metricas.map((m) => {
          const Icone = m.icone;
          return (
            <Card key={m.titulo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.titulo}</CardTitle>
                  <div className="grid size-10 place-items-center rounded-2xl bg-amadeus-blue-50 text-amadeus-blue">
                    <Icone className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-amadeus-blue">
                  {m.valor}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.descricao}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Placeholder para lista de eventos */}
      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>
              Crie seu primeiro evento para vê-lo aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-amadeus-blue-50/40 py-16">
              <div className="text-center">
                <CalendarPlus className="mx-auto size-12 text-amadeus-blue/40" />
                <h3 className="mt-4 text-lg font-extrabold text-amadeus-blue">
                  Nenhum evento ainda
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Clique em &quot;Novo evento&quot; para começar a configurar
                  seu primeiro evento.
                </p>
                <Button className="mt-6">
                  <CalendarPlus />
                  Criar primeiro evento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
