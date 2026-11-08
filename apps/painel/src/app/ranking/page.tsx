import type { Metadata } from "next";
import { Ranking } from "@/views/Ranking";

export const metadata: Metadata = { title: "Ranking e prêmios · Painel BFR" };

export default function Page() {
  return <Ranking />;
}
