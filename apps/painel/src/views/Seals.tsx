"use client";

import { getSupabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/format";
import { one, type SealSource } from "@/lib/types";
import { useData } from "@/lib/useData";
import { Badge, EmptyState, ErrorBox, GoldSeal, Loading, PageHeader } from "@/components/ui";

type SealRow = {
  nanny_id: string;
  source: SealSource;
  active: boolean;
  granted_at: string;
  revoked_at: string | null;
  greenn_sale_id: string | null;
  name: string | null;
};

type PendingRow = {
  id: string;
  email_lower: string | null;
  greenn_sale_id: string;
  created_at: string;
};

const SOURCE_LABEL: Record<SealSource, string> = {
  manual: "Manual",
  greenn: "Greenn",
  importacao: "Importação",
};

async function loadAll(): Promise<{ seals: SealRow[]; pending: PendingRow[] }> {
  const sb = getSupabase();
  const [seals, pending] = await Promise.all([
    sb
      .from("mentorship_seals")
      .select("nanny_id, source, active, granted_at, revoked_at, greenn_sale_id, nannies(profiles(full_name))")
      .order("granted_at", { ascending: false })
      .limit(5000),
    sb
      .from("pending_mentorships")
      .select("id, email_lower, greenn_sale_id, created_at")
      .is("linked_to", null)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (seals.error) throw seals.error;
  if (pending.error) throw pending.error;
  type RawSeal = Omit<SealRow, "name"> & { nannies: unknown };
  const sealRows = ((seals.data ?? []) as unknown as RawSeal[]).map(({ nannies, ...s }) => {
    const nanny = one(nannies as { profiles: unknown } | { profiles: unknown }[] | null);
    const profile = one((nanny?.profiles ?? null) as { full_name: string } | { full_name: string }[] | null);
    return { ...s, name: profile?.full_name ?? null };
  });
  return { seals: sealRows, pending: (pending.data ?? []) as PendingRow[] };
}

export function Seals() {
  const { data, error, loading, reload } = useData(loadAll);

  return (
    <>
      <PageHeader title="Selos e Greenn" description={<>Quem tem o selo dourado <GoldSeal compact label="Babá de Família Rica" /> e as compras da mentoria que ainda esperam cadastro.</>} />

      <section className="card soft-card">
        <h2 className="section-title">Como o selo liga sozinho</h2>
        <p className="body-text">
          Quando alguém compra a Mentoria Babá de Família Rica na Greenn, o selo dourado é ligado automaticamente na conta da babá
          com o mesmo e-mail ou CPF. Se a compra chegar antes do cadastro, ela fica guardada em “Compras sem cadastro” e o selo
          liga no momento em que a babá criar a conta. Reembolsos e cancelamentos desligam o selo sozinhos. Para casos especiais,
          use “Dar selo” ou “Retirar selo” na tela Babás.
        </p>
      </section>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}

      {data ? (
        <>
          <h2 className="section-title section-gap">Selos ({data.seals.filter((s) => s.active).length} ativos)</h2>
          {data.seals.length === 0 ? (
            <EmptyState title="Nenhum selo ainda">Os selos aparecem aqui quando uma compra for confirmada ou quando você ligar um à mão.</EmptyState>
          ) : (
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Desde</th>
                    <th scope="col">Venda na Greenn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.seals.map((s) => (
                    <tr key={s.nanny_id}>
                      <td data-label="Nome" className="cell-strong">
                        {s.name ?? "Sem nome"}
                      </td>
                      <td data-label="Origem">{SOURCE_LABEL[s.source] ?? s.source}</td>
                      <td data-label="Situação">
                        {s.active ? (
                          <GoldSeal compact />
                        ) : (
                          <Badge tone="neutral">Retirado{s.revoked_at ? ` em ${formatDate(s.revoked_at)}` : ""}</Badge>
                        )}
                      </td>
                      <td data-label="Desde">{formatDate(s.granted_at)}</td>
                      <td data-label="Venda na Greenn" className="mono">
                        {s.greenn_sale_id ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="section-title section-gap">Compras sem cadastro ({data.pending.length})</h2>
          {data.pending.length === 0 ? (
            <EmptyState title="Nenhuma compra esperando">Todas as compras da Greenn já estão ligadas a uma babá cadastrada.</EmptyState>
          ) : (
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">E-mail da compra</th>
                    <th scope="col">Venda na Greenn</th>
                    <th scope="col">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending.map((p) => (
                    <tr key={p.id}>
                      <td data-label="E-mail da compra" className="cell-strong break">
                        {p.email_lower ?? "Sem e-mail (só CPF)"}
                      </td>
                      <td data-label="Venda na Greenn" className="mono">
                        {p.greenn_sale_id}
                      </td>
                      <td data-label="Data">{formatDateTime(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
