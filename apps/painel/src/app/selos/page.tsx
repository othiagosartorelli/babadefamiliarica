import type { Metadata } from "next";
import { Seals } from "@/views/Seals";

export const metadata: Metadata = { title: "Selos e Greenn · Painel BFR" };

export default function Page() {
  return <Seals />;
}
