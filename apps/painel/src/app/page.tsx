import type { Metadata } from "next";
import { Overview } from "@/views/Overview";

export const metadata: Metadata = { title: "Visão geral · Painel BFR" };

export default function Page() {
  return <Overview />;
}
