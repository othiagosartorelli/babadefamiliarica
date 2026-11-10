"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatBRL, formatNumber } from "@/lib/format";
import { familyTotal, isTestPayment, loadBookings, nannyNet, type Booking } from "@/lib/bookings";
import type { SealSource } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { ErrorBox, Loading, Notice, PageHeader } from "@/components/ui";

type Period = "mes" | "anterior" | "tudo";

type Taxas = Partial<Record<"baba_1a" | "baba_recontratacao" | "familia_1a" | "familia_recontratacao" | "familia_premium" | "urgencia", number>>;

type FinanceData = {
  bookings: Booking[];
  testMode: boolean;
  taxas: Taxas | null;
  premium: number;
  sealsBySource: Record<SealSource, number>;
  loadedAt: number;
};

async function loadFinance(): Promise<FinanceData> {
  const sb = getSupabase();
  const loadedAt = Date.now();
  const [bookings, settings, premium, seals] = await Promise.all([
    loadBookings(),
    sb.from("app_settings").select("key, value").in("key", ["pagamento_de_teste", "taxas"]),
    sb.from("mothers").select("id", { count: "exact", head: true }).gt("premium_until", new Date(loadedAt).toISOString()),
    sb.from("mentorship_seals").select("source").eq("active", true).limit(10000),
  ]);
  if (settings.error) throw settings.error;
  if (premium.error) throw premium.error;
  if (seals.error) throw seals.error;
  const map = new Map((settings.data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const sealsBySource: Record<SealSource, number> = { greenn: 0, manual: 0, importacao: 0 };
  for (const s of (seals.data ?? []) as { source: SealSource }[]) sealsBySource[s.source] = (sealsBySource[s.source] ?? 0) + 1;
  return {
    bookings,
    // Na dúvida (configuração ausente), trata como teste: é o lado seguro.
    testMode: map.has("pagamento_de_teste") ? map.get("pagamento_de_teste") === true : true,
    taxas: (map.get("taxas") as Taxas | undefined) ?? null,
    premium: premium.count ?? 0,
    sealsBySource,
    loadedAt,
  };
}

function periodRange(period: Period, now: number): [number, number] | null {
  if (period === "tudo") return null;
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth() - (period === "anterior" ? 1 : 0), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + (period === "anterior" ? 0 : 1), 1).getTime();
  return [start, end];
}

const PAID = new Set(["paga", "em_andamento", "concluida"]);

function summarize(list: Booking[], now: number) {
  let paidTotal = 0,
    paidCount = 0,
    revenue = 0,
    payouts = 0,
    toPay = 0,
    toPayCount = 0,
    refunds = 0,
    refundCount = 0,
    done = 0,
    test = 0;
  for (const b of list) {
    if (isTestPayment(b)) test++;
    if (PAID.has(b.status)) {
      paidTotal += familyTotal(b);
      paidCount++;
    }
    if (b.status === "concluida") {
      done++;
      revenue += b.family_fee_cents + b.urgent_fee_cents + b.nanny_fee_cents;
      payouts += nannyNet(b);
      if (b.payout_at && new Date(b.payout_at).getTime() > now) {
        toPay += nannyNet(b);
        toPayCount++;
      }
    }
    if (b.status === "cancelada") {
      // Só conta o que ficou retido de quem tinha pago: o total menos o reembolso e a parte da babá.
      if (b.paid_at) revenue += Math.max(0, familyTotal(b) - b.family_refund_cents - b.nanny_cancel_share_cents);
      payouts += b.nanny_cancel_share_cents;
      if (b.family_refund_cents > 0) {
        refunds += b.family_refund_cents;
        refundCount++;
      }
    }
  }
  return { paidTotal, paidCount, revenue, payouts, toPay, toPayCount, refunds, refundCount, done, test };
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

const pct = (n: number | undefined) => (n == null ? "—" : `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

export function Finance() {
  const { data, error, loading, reload } = useData(loadFinance);
  const { notice, clearNotice, busy, run } = useActions();
  const [period, setPeriod] = useState<Period>("mes");

  const sum = useMemo(() => {
    if (!data) return null;
    const range = periodRange(period, data.loadedAt);
    const list = range
      ? data.bookings.filter((b) => {
          const t = new Date(b.starts_at).getTime();
          return t >= range[0] && t < range[1];
        })
      : data.bookings;
    return summarize(list, data.loadedAt);
  }, [data, period]);

  async function setTestMode(on: boolean) {
    if (!on) {
      const ok = window.confirm(
        "Desligar o pagamento de teste?\n\nSem um sistema de pagamento contratado e ligado ao app, as mães NÃO conseguirão pagar as contratações. Só desligue quando o pagamento real estiver funcionando.",
      );
      if (!ok) return;
    }
    const done = await run(
      "test-mode",
      async () => {
        const { error } = await getSupabase().from("app_settings").upsert({ key: "pagamento_de_teste", value: on }, { onConflict: "key" });
        if (error) throw error;
      },
      on ? "Pagamento de teste ligado: as mães pagam sem cobrança real." : "Pagamento de teste desligado.",
    );
    if (done) reload();
  }

  const cards = sum
    ? [
        { label: "Total pago pelas famílias", value: formatBRL(sum.paidTotal), hint: `${plural(sum.paidCount, "contratação paga", "contratações pagas")}, em andamento ou concluída${sum.paidCount === 1 ? "" : "s"}` },
        { label: "Receita da plataforma", value: formatBRL(sum.revenue), hint: "Taxas das concluídas e o que ficou retido nos cancelamentos" },
        { label: "Repasses às babás", value: formatBRL(sum.payouts), hint: "Líquido das concluídas e partes de cancelamento" },
        { label: "A repassar", value: formatBRL(sum.toPay), hint: `${plural(sum.toPayCount, "repasse agendado", "repasses agendados")} para os próximos dias` },
        { label: "Reembolsos às famílias", value: formatBRL(sum.refunds), hint: `${plural(sum.refundCount, "cancelamento", "cancelamentos")} com reembolso` },
      ]
    : [];

  return (
    <>
      <PageHeader title="Financeiro" description="Valores calculados a partir das contratações registradas no app." />

      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {data ? (
        <section className={data.testMode ? "card test-banner" : "card"} aria-labelledby="modo-pagamento">
          <div className="test-banner-row">
            <div>
              <h2 id="modo-pagamento" className="section-title no-margin">
                {data.testMode ? "Fase de testes: pagamentos simulados" : "Pagamento real ligado"}
              </h2>
              <p className="body-text section-note">
                {data.testMode
                  ? "As mães “pagam” sem nenhuma cobrança no cartão. Os valores abaixo são de contratações de teste e não representam dinheiro recebido."
                  : "O modo de teste está desligado. As contratações dependem do sistema de pagamento real para serem pagas."}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={data.testMode}
                disabled={busy === "test-mode"}
                onChange={(e) => void setTestMode(e.target.checked)}
                aria-describedby="switch-hint"
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
              <span>Pagamento de teste {data.testMode ? "ligado" : "desligado"}</span>
            </label>
          </div>
          <p id="switch-hint" className="muted small">
            Desligue só quando o sistema de pagamento estiver contratado e funcionando no app.
          </p>
        </section>
      ) : null}

      <div className="toolbar section-gap">
        <h2 className="section-title no-margin grow">Contratações</h2>
        <div className="segmented no-margin" role="group" aria-label="Período">
          {(
            [
              ["mes", "Mês atual"],
              ["anterior", "Mês anterior"],
              ["tudo", "Tudo"],
            ] as [Period, string][]
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={period === v} className={period === v ? "seg active" : "seg"} onClick={() => setPeriod(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : sum ? (
        <>
          <div className="stat-grid">
            {cards.map((c) => (
              <div key={c.label} className="stat-card">
                <span className="stat-label">{c.label}</span>
                <span className="stat-value stat-money">{c.value}</span>
                <span className="stat-hint">{c.hint}</span>
              </div>
            ))}
          </div>
          <p className="muted small">
            O período considera a data da diária. {sum.test > 0 ? `${plural(sum.test, "contratação deste período teve", "contratações deste período tiveram")} pagamento de teste.` : ""}
          </p>
        </>
      ) : null}

      {data ? (
        <div className="two-col section-gap">
          <section className="card">
            <h2 className="section-title">Assinaturas e mentoria</h2>
            <ul className="plain-list">
              <li>
                <strong>{formatNumber(data.premium)}</strong> {data.premium === 1 ? "mãe com premium ativo" : "mães com premium ativo"}.
              </li>
              <li>
                Selos ativos: <strong>{formatNumber(data.sealsBySource.greenn)}</strong> pela Greenn,{" "}
                <strong>{formatNumber(data.sealsBySource.manual)}</strong> {data.sealsBySource.manual === 1 ? "manual" : "manuais"} e{" "}
                <strong>{formatNumber(data.sealsBySource.importacao)}</strong> por importação.
              </li>
            </ul>
            <p className="muted small section-note">
              Os valores das assinaturas premium ficam nas lojas (App Store e Google Play) e os da mentoria, na Greenn. Este painel
              mostra só as contagens.
            </p>
          </section>
          <section className="card soft-card">
            <h2 className="section-title">Taxas em vigor</h2>
            <ul className="plain-list">
              <li>
                Babá: {pct(data.taxas?.baba_1a)} na primeira contratação com uma família e {pct(data.taxas?.baba_recontratacao)} nas
                recontratações.
              </li>
              <li>
                Família: {pct(data.taxas?.familia_1a)} na primeira contratação, {pct(data.taxas?.familia_recontratacao)} nas
                recontratações e {pct(data.taxas?.familia_premium)} para quem é premium.
              </li>
              <li>Pedido com menos de 24 horas: mais {pct(data.taxas?.urgencia)} para a família.</li>
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
