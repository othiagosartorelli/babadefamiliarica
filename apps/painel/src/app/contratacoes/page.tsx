import type { Metadata } from "next";
import { Bookings } from "@/views/Bookings";

export const metadata: Metadata = { title: "Contratações · Painel BFR" };

export default function Page() {
  return <Bookings />;
}
