import type { Metadata } from "next";
import { Nannies } from "@/views/Nannies";

export const metadata: Metadata = { title: "Babás · Painel BFR" };

export default function Page() {
  return <Nannies />;
}
