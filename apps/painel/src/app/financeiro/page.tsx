import type { Metadata } from "next";
import { Finance } from "@/views/Finance";

export const metadata: Metadata = { title: "Financeiro · Painel BFR" };

export default function Page() {
  return <Finance />;
}
