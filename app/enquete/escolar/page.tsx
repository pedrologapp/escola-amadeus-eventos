import { cookies } from "next/headers";
import { ENQUETE_PAIS } from "@/lib/enquete-config";
import { EnqueteForm } from "../enquete-form";

export default async function EnqueteFundamental1Page() {
  const store = await cookies();
  const jaRespondeu = store.get(`enquete_${ENQUETE_PAIS.slug}`)?.value === "1";

  return <EnqueteForm def={ENQUETE_PAIS} jaRespondeu={jaRespondeu} />;
}
