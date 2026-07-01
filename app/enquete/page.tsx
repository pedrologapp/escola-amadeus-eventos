import { cookies } from "next/headers";
import { ENQUETE_ALUNOS } from "@/lib/enquete-config";
import { EnqueteForm } from "./enquete-form";

export default async function EnquetePage() {
  const store = await cookies();
  const jaRespondeu =
    store.get(`enquete_${ENQUETE_ALUNOS.slug}`)?.value === "1";

  return <EnqueteForm def={ENQUETE_ALUNOS} jaRespondeu={jaRespondeu} />;
}
