import type { Metadata } from "next";
import { Appeals } from "@/views/Appeals";

export const metadata: Metadata = { title: "Pedidos de revisão · Painel BFR" };

export default function Page() {
  return <Appeals />;
}
