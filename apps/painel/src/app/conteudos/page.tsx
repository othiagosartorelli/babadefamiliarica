import type { Metadata } from "next";
import { Contents } from "@/views/Contents";

export const metadata: Metadata = { title: "Conteúdos · Painel BFR" };

export default function Page() {
  return <Contents />;
}
