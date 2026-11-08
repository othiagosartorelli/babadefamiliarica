"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { one } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { Badge, Button, EmptyState, ErrorBox, Loading, Notice, PageHeader } from "@/components/ui";

type MotherRow = {
  id: string;
  premium_until: string | null;
  profiles: { full_name: string; city: string | null; state: string | null; created_at: string } | null;
};

async function loadMothers(): Promise<MotherRow[]> {
  const { data, error } = await getSupabase()
    .from("mothers")
    .select("id, premium_until, profiles(full_name, city, state, created_at)")
    .limit(5000);
  if (error) throw error;
  type Raw = Omit<MotherRow, "profiles"> & { profiles: MotherRow["profiles"] | MotherRow["profiles"][] };
  return ((data ?? []) as unknown as Raw[])
    .map((m) => ({ ...m, profiles: one(m.profiles) }))
    .sort((a, b) => (b.profiles?.created_at ?? "").localeCompare(a.profiles?.created_at ?? ""));
}

const DAYS_30 = 30 * 24 * 3600 * 1000;

function thirtyDaysFromNow(): string {
  return new Date(Date.now() + DAYS_30).toISOString();
}

export function Mothers() {
  const { data, error, loading, reload } = useData(loadMothers);
  const { notice, clearNotice, busy, run } = useActions();
  const [query, setQuery] = useState("");
  // Momento da última carga: decide quem está premium agora (sem ler o relógio durante a renderização).
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((m) => !q || (m.profiles?.full_name ?? "").toLowerCase().includes(q));
  }, [data, query]);

  const sb = getSupabase();

  async function setPremium(m: MotherRow, give: boolean) {
    const name = m.profiles?.full_name ?? "mãe";
    if (!give && !window.confirm(`Retirar o premium de ${name}?`)) return;
    const until = give ? thirtyDaysFromNow() : null;
    const ok = await run(
      `prem-${m.id}`,
      async () => {
        const { error } = await sb.from("mothers").update({ premium_until: until }).eq("id", m.id);
        if (error) throw error;
      },
      give ? `${name} tem premium de teste até ${formatDate(until)}.` : `Premium de ${name} retirado.`,
    );
    if (ok) reload();
  }

  return (
    <>
      <PageHeader
        title="Mães"
        description="Dê 30 dias de premium de teste para uma mãe conhecer todas as babás, ou retire o premium."
      />
      <div className="toolbar">
        <div className="field field-inline grow">
          <label htmlFor="busca-mae">Buscar por nome</label>
          <input id="busca-mae" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Mariana" />
        </div>
      </div>

      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title={data?.length ? "Nenhuma mãe encontrada" : "Ainda não há mães cadastradas"}>
          {data?.length ? "Tente outro nome." : "As mães aparecem aqui assim que criarem a conta no app."}
        </EmptyState>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Cidade</th>
                <th scope="col">Premium até</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const active = !!m.premium_until && new Date(m.premium_until).getTime() > now;
                const city = [m.profiles?.city, m.profiles?.state].filter(Boolean).join(" · ");
                return (
                  <tr key={m.id}>
                    <td data-label="Nome" className="cell-strong">
                      {m.profiles?.full_name ?? "Sem nome"}
                    </td>
                    <td data-label="Cidade">{city || "—"}</td>
                    <td data-label="Premium até">
                      {active ? (
                        <Badge tone="ok">{formatDate(m.premium_until)}</Badge>
                      ) : m.premium_until ? (
                        <span className="muted">Venceu em {formatDate(m.premium_until)}</span>
                      ) : (
                        <span className="muted">Sem premium</span>
                      )}
                    </td>
                    <td className="cell-actions">
                      <div className="row-actions">
                        <Button busy={busy === `prem-${m.id}`} onClick={() => setPremium(m, true)}>
                          {active ? "Renovar 30 dias a partir de hoje" : "Dar premium de teste por 30 dias"}
                        </Button>
                        {m.premium_until ? (
                          <Button variant="secondary" disabled={busy === `prem-${m.id}`} onClick={() => setPremium(m, false)}>
                            Retirar premium
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
