import { redirect } from "next/navigation";

/** "Diversos" virou "Campanhas" (e Enquete foi para Comunicação). */
export default function DiversosPage() {
  redirect("/admin/campanhas");
}
