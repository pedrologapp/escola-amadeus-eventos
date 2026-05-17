import { Calendar, Heart, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amadeus-blue-50 via-white to-amadeus-yellow-50" />
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="accent" className="mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Em construção
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-amadeus-blue sm:text-6xl">
              Eventos da Escola Amadeus
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Em breve, todos os eventos da escola num só lugar. Inscrições e
              pagamentos rápidos, sem complicação.
            </p>
          </div>
        </div>
      </section>

      {/* PREVIEW DOS CARDS DE EVENTO (placeholders) */}
      <section className="container mx-auto px-4 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-amadeus-blue">
              Como os eventos vão aparecer
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Esses são exemplos. Em breve cards reais aparecerão aqui.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              titulo: "Dia das Mães",
              data: "16 de maio · 15h",
              local: "Novo Auditório",
              cor: "from-pink-400 to-rose-500",
              icone: Heart,
            },
            {
              titulo: "Festa Junina",
              data: "20 de junho · 16h",
              local: "Quadra coberta",
              cor: "from-amber-400 to-orange-500",
              icone: Users,
            },
            {
              titulo: "Formatura 5º ano",
              data: "12 de dezembro · 19h",
              local: "Auditório principal",
              cor: "from-amadeus-blue to-amadeus-blue-light",
              icone: Calendar,
            },
          ].map((evento) => {
            const Icone = evento.icone;
            return (
              <Card
                key={evento.titulo}
                className="overflow-hidden transition-all hover:-translate-y-1 hover:shadow-float-lg"
              >
                <div
                  className={`relative grid h-44 place-items-center bg-gradient-to-br ${evento.cor}`}
                >
                  <Icone className="size-12 text-white/90" />
                </div>
                <CardHeader>
                  <CardTitle>{evento.titulo}</CardTitle>
                  <CardDescription>
                    {evento.data} · {evento.local}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="muted">Exemplo</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
