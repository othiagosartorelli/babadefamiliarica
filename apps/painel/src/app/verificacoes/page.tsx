import type { Metadata } from "next";
import { Verifications } from "@/views/Verifications";

export const metadata: Metadata = { title: "Verificações · Painel BFR" };

export default function Page() {
  return <Verifications />;
}
