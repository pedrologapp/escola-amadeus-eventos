import { CheckCircle2 } from "lucide-react";
import { AVISO_APOIO } from "@/lib/enquete-config";

export default function ObrigadoPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-amadeus-blue text-white shadow-float">
        <CheckCircle2 className="size-9" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-amadeus-blue">
        Respostas enviadas!
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Muito obrigado por compartilhar a sua opinião. Cada resposta ajuda a
        deixar o Centro Educacional Amadeus melhor pra você. 💙
      </p>
      <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm">
        {AVISO_APOIO}
      </p>
    </div>
  );
}
