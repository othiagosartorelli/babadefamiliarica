"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatBRL, formatDate } from "@/lib/format";
import { one, type SealSource } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { Badge, Button, EmptyState, ErrorBox, GoldSeal, Loading, Notice, PageHeader } from "@/components/ui";

type NannyRow = {
  id: string;
  hourly_rate_cents: number | null;
  is_published: boolean;
  is_sample: boolean;
  created_at: string;
  profiles: { full_name: string; city: string | null; state: string | null; neighborhood: string | null } | null;
  mentorship_seals: { active: boolean; source: SealSource } | null;
};

type RawNanny = Omit<NannyRow, "profiles" | "mentorship_seals"> & {
  profiles: NannyRow["profiles"] | NannyRow["profiles"][];
  mentorship_seals: NannyRow["mentorship_seals"] | NannyRow["mentorship_seals"][];
};

async function loadNannies(): Promise<NannyRow[]> {
  const { data, error } = await getSupabase()
    .from("nannies")
    .select(
      "id, hourly_rate_cents, is_published, is_sample, created_at, profiles(full_name, city, state, neighborhood), mentorship_seals(active, source)",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as unknown as RawNanny[]).map((n) => ({
    ...n,
    profiles: one(n.profiles),
    mentorship_seals: one(n.mentorship_seals),
  }));
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function initialWaiting() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("aguardando") === "1";
}

export function Nannies() {
  const { data, error, loading, reload } = useData(loadNannies);
  const { notice, clearNotice, busy, run } = useActions();
  const [query, setQuery] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(initialWaiting);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (data ?? []).filter((n) => {
      if (onlyWaiting && n.is_published) return false;
      if (q && !normalize(n.profiles?.full_name ?? "").includes(q)) return false;
      return true;
    });
  }, [data, query, onlyWaiting]);

  const waitingCount = (data ?? []).filter((n) => !n.is_published).length;
  const sb = getSupabase();

  async function setPublished(n: NannyRow, value: boolean) {
    const ok = await run(
      `pub-${n.id}`,
      async () => {
        const { error } = await sb.from("nannies").update({ is_published: value }).eq("id", n.id);
        if (error) throw error;
      },
      value ? `Perfil de ${n.profiles?.full_name ?? "babá"} publicado.` : `Perfil de ${n.profiles?.full_name ?? "babá"} saiu do ar.`,
    );
    if (ok) reload();
  }

  async function setSeal(n: NannyRow, value: boolean) {
    const name = n.profiles?.full_name ?? "babá";
    if (!value && !window.confirm(`Retirar o selo dourado de ${name}?`)) return;
    const ok = await run(
      `seal-${n.id}`,
      async () => {
        const now = new Date().toISOString();
        const { error } = value
          ? await sb
              .from("mentorship_seals")
              .upsert({ nanny_id: n.id, source: "manual", active: true, granted_at: now, revoked_at: null }, { onConflict: "nanny_id" })
          : await sb.from("mentorship_seals").update({ active: false, revoked_at: now }).eq("nanny_id", n.id);
        if (error) throw error;
      },
      value ? `Selo dourado ligado para ${name}.` : `Selo retirado de ${name}.`,
    );
    if (ok) reload();
  }

  async function setSample(n: NannyRow, value: boolean) {
    const ok = await run(
      `sample-${n.id}`,
      async () => {
        const { error } = await sb.from("nannies").update({ is_sample: value }).eq("id", n.id);
        if (error) throw error;
      },
      value
        ? `${n.profiles?.full_name ?? "Babá"} agora é perfil de exemplo (visto por mães sem premium).`
        : `${n.profiles?.full_name ?? "Babá"} deixou de ser perfil de exemplo.`,
    );
    if (ok) reload();
  }

  return (
    <>
      <PageHeader
        title="Babás"
        description="Publique perfis, ligue o selo da mentoria e escolha os perfis de exemplo que as mães sem premium podem ver."
      />

      <div className="toolbar">
        <div className="field field-inline grow">
          <label htmlFor="busca-baba">Buscar por nome</label>
          <input
            id="busca-baba"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: Juliana"
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} />
          <span>Só aguardando aprovação{data ? ` (${waitingCount})` : ""}</span>
        </label>
      </div>

      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title={data?.length ? "Nenhuma babá encontrada" : "Ainda não há babás cadastradas"}>
          {data?.length
            ? "Tente outro nome ou desmarque o filtro."
            : "Quando as primeiras babás se cadastrarem no app, elas aparecem aqui para você aprovar."}
        </EmptyState>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Cidade / bairro</th>
                <th scope="col">Valor/hora</th>
                <th scope="col">Publicada</th>
                <th scope="col">Selo</th>
                <th scope="col">Criada em</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const sealOn = !!n.mentorship_seals?.active;
                const place = [n.profiles?.neighborhood, n.profiles?.city].filter(Boolean).join(", ");
                return (
                  <tr key={n.id}>
                    <td data-label="Nome" className="cell-strong">
                      {n.profiles?.full_name ?? "Sem nome"}
                      {n.is_sample ? (
                        <span className="cell-note">
                          <Badge tone="plum">Perfil de exemplo</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Cidade / bairro">{place || "—"}</td>
                    <td data-label="Valor/hora">{formatBRL(n.hourly_rate_cents)}</td>
                    <td data-label="Publicada">
                      {n.is_published ? <Badge tone="ok">Sim</Badge> : <Badge tone="warn">Aguardando</Badge>}
                    </td>
                    <td data-label="Selo">{sealOn ? <GoldSeal compact /> : <span className="muted">Não</span>}</td>
                    <td data-label="Criada em">{formatDate(n.created_at)}</td>
                    <td className="cell-actions">
                      <div className="row-actions">
                        <Button
                          variant={n.is_published ? "secondary" : "primary"}
                          busy={busy === `pub-${n.id}`}
                          onClick={() => setPublished(n, !n.is_published)}
                        >
                          {n.is_published ? "Despublicar" : "Publicar"}
                        </Button>
                        <Button variant="secondary" busy={busy === `seal-${n.id}`} onClick={() => setSeal(n, !sealOn)}>
                          {sealOn ? "Retirar selo" : "Dar selo"}
                        </Button>
                        <Button variant="ghost" busy={busy === `sample-${n.id}`} onClick={() => setSample(n, !n.is_sample)}>
                          {n.is_sample ? "Tirar de exemplo" : "Marcar como exemplo"}
                        </Button>
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
