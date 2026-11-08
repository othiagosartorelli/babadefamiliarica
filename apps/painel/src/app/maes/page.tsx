import type { Metadata } from "next";
import { Mothers } from "@/views/Mothers";

export const metadata: Metadata = { title: "Mães · Painel BFR" };

export default function Page() {
  return <Mothers />;
}
