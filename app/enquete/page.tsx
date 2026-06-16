import { cookies } from "next/headers";
import { ENQUETE_SLUG } from "@/lib/enquete-config";
import { EnqueteForm } from "./enquete-form";

export default async function EnquetePage() {
  const store = await cookies();
  const jaRespondeu = store.get(`enquete_${ENQUETE_SLUG}`)?.value === "1";

  return <EnqueteForm jaRespondeu={jaRespondeu} />;
}
