import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="Página não encontrada">
      Esse endereço não existe no painel. <Link href="/">Voltar para a visão geral</Link>.
    </EmptyState>
  );
}
