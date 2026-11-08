"use client";

import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/format";
import { useData } from "@/lib/useData";
import { ErrorBox, GoldSeal, PageHeader } from "@/components/ui";

type Counts = {
  published: number;
  waiting: number;
  seals: number;
  mothers: number;
  premium: number;
  appeals: number;
  conversations: number;
};

async function loadCounts(): Promise<Counts> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const head = { count: "exact" as const, head: true };
  const results = await Promise.all([
    sb.from("nannies").select("id", head).eq("is_published", true),
    sb.from("nannies").select("id", head).eq("is_published", false),
    sb.from("mentorship_seals").select("nanny_id", head).eq("active", true),
    sb.from("mothers").select("id", head),
    sb.from("mothers").select("id", head).gt("premium_until", now),
    sb.from("appeals").select("id", head).eq("status", "aberto"),
    sb.from("conversations").select("id", head),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  const [published, waiting, seals, mothers, premium, appeals, conversations] = results.map((r) => r.count ?? 0);
  return { published, waiting, seals, mothers, premium, appeals, conversations };
}

export function Overview() {
  const { data, error, loading, reload } = useData(loadCounts);

  const cards: { label: string; value?: number; href?: string; hint: string; highlight?: boolean; seal?: boolean }[] = [
    { label: "Babás publicadas", value: data?.published, href: "/babas", hint: "Aparecem para as mães" },
    {
      label: "Aguardando aprovação",
      value: data?.waiting,
      href: "/babas?aguardando=1",
      hint: "Babás ainda não publicadas",
      highlight: (data?.waiting ?? 0) > 0,
    },
    { label: "Mentoradas com selo", value: data?.seals, href: "/selos", hint: "Selo dourado ativo", seal: true },
    { label: "Mães cadastradas", value: data?.mothers, href: "/maes", hint: "Todas as contas de mãe" },
    { label: "Mães premium", value: data?.premium, href: "/maes", hint: "Premium válido hoje" },
    {
      label: "Pedidos de revisão abertos",
      value: data?.appeals,
      href: "/revisoes",
      hint: "Esperando sua decisão",
      highlight: (data?.appeals ?? 0) > 0,
    },
    { label: "Conversas", value: data?.conversations, hint: "Entre mães e babás" },
  ];

  return (
    <>
      <PageHeader title="Visão geral" description="Os números de hoje, direto do banco do app." />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      <div className="stat-grid">
        {cards.map((c) => {
          const cls = c.highlight ? "stat-card stat-card-highlight" : "stat-card";
          const inner = (
            <>
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">
                {loading && c.value === undefined ? (
                  <span className="skeleton" aria-label="Carregando" />
                ) : c.value === undefined ? (
                  "—"
                ) : (
                  formatNumber(c.value)
                )}
              </span>
              <span className="stat-hint">{c.seal ? <GoldSeal compact label="Mentoria" /> : c.hint}</span>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className={`${cls} stat-link`}>
              {inner}
            </Link>
          ) : (
            <div key={c.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      <section className="card soft-card">
        <h2 className="section-title">Como o dia a dia funciona</h2>
        <ul className="plain-list">
          <li>A moderação das conversas e avaliações é feita automaticamente pela IA. Aqui chegam só os pedidos de revisão.</li>
          <li>Compras da mentoria na Greenn ligam o selo dourado sozinhas. Você pode ligar ou desligar à mão em Babás.</li>
          <li>Uma babá só aparece para as mães depois que você publica o perfil dela.</li>
        </ul>
      </section>
    </>
  );
}
