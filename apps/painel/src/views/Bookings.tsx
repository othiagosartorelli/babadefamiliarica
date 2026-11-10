"use client";

import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import { STATUS_LABEL, STATUS_ORDER, familyTotal, isTestPayment, loadBookings, nannyNet, type Booking, type BookingStatus } from "@/lib/bookings";
import { useData } from "@/lib/useData";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "@/components/ui";

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function when(b: Booking) {
  const s = new Date(b.starts_at);
  const e = new Date(b.ends_at);
  return { day: dayFmt.format(s), hours: `${timeFmt.format(s)}–${timeFmt.format(e)}` };
}

function statusTone(s: BookingStatus): "ok" | "warn" | "plum" | "neutral" {
  if (s === "concluida" || s === "paga" || s === "em_andamento") return "ok";
  if (s === "disputa" || s === "aceita" || s === "proposta") return "warn";
  if (s === "cancelada") return "plum";
  return "neutral";
}

export function Bookings() {
  const { data, error, loading, reload } = useData(loadBookings);
  const [status, setStatus] = useState<BookingStatus | "todos">("todos");

  const counts = useMemo(() => {
    const c: Partial<Record<BookingStatus, number>> = {};
    for (const b of data ?? []) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [data]);

  const rows = useMemo(() => (data ?? []).filter((b) => status === "todos" || b.status === status), [data, status]);

  return (
    <>
      <PageHeader title="Contratações" description="Todas as diárias pedidas pelo app, da proposta ao pagamento, das mais recentes para as mais antigas." />

      <div className="toolbar">
        <div className="field field-inline">
          <label htmlFor="b-status">Situação</label>
          <select id="b-status" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | "todos")}>
            <option value="todos">Todas ({data?.length ?? 0})</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]} ({counts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title={data?.length ? "Nenhuma contratação nesta situação" : "Ainda não há contratações"}>
          {data?.length ? "Escolha outra situação no filtro." : "Quando uma mãe enviar a primeira proposta pelo app, ela aparece aqui."}
        </EmptyState>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Mãe</th>
                <th scope="col">Babá</th>
                <th scope="col">Situação</th>
                <th scope="col" className="num">
                  Total da família
                </th>
                <th scope="col" className="num">
                  Líquido da babá
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const w = when(b);
                return (
                  <tr key={b.id}>
                    <td data-label="Data">
                      <span className="cell-date">
                        {w.day}
                        <span className="muted small">{w.hours}</span>
                      </span>
                    </td>
                    <td data-label="Mãe">{b.mother_first_name ?? "—"}</td>
                    <td data-label="Babá" className="cell-strong-plain">
                      {b.nanny_name ?? "—"}
                    </td>
                    <td data-label="Situação">
                      <span className="badge-row">
                        <Badge tone={statusTone(b.status)}>{STATUS_LABEL[b.status]}</Badge>
                        {isTestPayment(b) ? <Badge tone="neutral">Teste</Badge> : null}
                      </span>
                    </td>
                    <td data-label="Total da família" className="num">
                      <span className="num-stack">
                        {formatBRL(familyTotal(b))}
                        {b.status === "cancelada" && b.family_refund_cents > 0 ? (
                          <span className="muted small block">Reembolso {formatBRL(b.family_refund_cents)}</span>
                        ) : null}
                      </span>
                    </td>
                    <td data-label="Líquido da babá" className="num">
                      {b.status === "cancelada" ? (
                        <span className="num-stack">
                          {formatBRL(b.nanny_cancel_share_cents)}
                          <span className="muted small block">parte do cancelamento</span>
                        </span>
                      ) : (
                        formatBRL(nannyNet(b))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small section-gap">
        “Teste” marca pagamentos simulados da fase de testes: nada foi cobrado de verdade.
      </p>
    </>
  );
}
