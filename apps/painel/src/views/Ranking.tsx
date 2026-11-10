"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { one } from "@/lib/types";
import { useData } from "@/lib/useData";
import { Badge, EmptyState, ErrorBox, GoldSeal, Loading, PageHeader } from "@/components/ui";

type Level = "nova" | "prata" | "ouro" | "elite";

type RankRow = {
  id: string;
  level: Level;
  rating: number | null;
  review_count: number;
  rehire_rate: number;
  ranking_score: number;
  name: string;
  city: string | null;
  seal: boolean;
};

const LEVEL_LABEL: Record<Level, string> = { nova: "Nova", prata: "Prata", ouro: "Ouro", elite: "Elite" };

async function loadRanking(): Promise<RankRow[]> {
  const { data, error } = await getSupabase()
    .from("nannies")
    .select("id, level, rating, review_count, rehire_rate, ranking_score, profiles(full_name, city), mentorship_seals(active)")
    .eq("is_published", true)
    .order("ranking_score", { ascending: false })
    .limit(2000);
  if (error) throw error;
  type Raw = Omit<RankRow, "name" | "city" | "seal"> & { profiles: unknown; mentorship_seals: unknown };
  return ((data ?? []) as unknown as Raw[]).map(({ profiles, mentorship_seals, ...n }) => {
    const p = one(profiles as { full_name: string; city: string | null } | { full_name: string; city: string | null }[] | null);
    const s = one(mentorship_seals as { active: boolean } | { active: boolean }[] | null);
    return {
      ...n,
      rating: n.rating == null ? null : Number(n.rating),
      rehire_rate: Number(n.rehire_rate ?? 0),
      ranking_score: Number(n.ranking_score ?? 0),
      name: p?.full_name ?? "Sem nome",
      city: p?.city ?? null,
      seal: !!s?.active,
    };
  });
}

const num1 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const num2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Ranking() {
  const { data, error, loading, reload } = useData(loadRanking);
  const [city, setCity] = useState("todas");

  const cities = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.city).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [data],
  );
  const rows = useMemo(() => (data ?? []).filter((r) => city === "todas" || r.city === city), [data, city]);

  return (
    <>
      <PageHeader
        title="Ranking e prêmios"
        description="Babás publicadas, da maior para a menor pontuação. Nota, nível e pontuação são recalculados sozinhos a cada avaliação e atendimento."
      />

      <div className="toolbar">
        <div className="field field-inline">
          <label htmlFor="r-city">Cidade</label>
          <select id="r-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="todas">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma babá no ranking ainda">
          {data?.length ? "Nenhuma babá publicada nesta cidade." : "O ranking aparece quando houver babás publicadas."}
        </EmptyState>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="num">
                  Posição
                </th>
                <th scope="col">Babá</th>
                <th scope="col">Nível</th>
                <th scope="col" className="num">
                  Nota
                </th>
                <th scope="col" className="num">
                  Avaliações
                </th>
                <th scope="col" className="num">
                  Recontratação
                </th>
                <th scope="col" className="num">
                  Pontuação
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td data-label="Posição" className="num rank-pos">
                    {i + 1}º
                  </td>
                  <td data-label="Babá" className="cell-strong">
                    {r.name}
                    <span className="cell-note">
                      {r.city ? <span className="muted small">{r.city}</span> : null}
                      {r.seal ? (
                        <span className="cell-seal">
                          <GoldSeal compact label="Babá de Família Rica" />
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label="Nível">
                    <span className={`level level-${r.level}`}>{LEVEL_LABEL[r.level] ?? r.level}</span>
                  </td>
                  <td data-label="Nota" className="num">
                    {r.rating == null ? <span className="muted">Sem nota</span> : num2(r.rating)}
                  </td>
                  <td data-label="Avaliações" className="num">
                    {r.review_count}
                  </td>
                  <td data-label="Recontratação" className="num">
                    {r.review_count === 0 && r.rehire_rate === 0 ? "—" : `${Math.round(r.rehire_rate * 100)}%`}
                  </td>
                  <td data-label="Pontuação" className="num">
                    <Badge tone="plum">{num1(r.ranking_score)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="two-col section-gap">
        <section className="card soft-card">
          <h2 className="section-title">Babá do Ano</h2>
          <p className="body-text">O prêmio anual combina três partes:</p>
          <ul className="plain-list">
            <li>
              <strong>60%</strong> pontuação do ranking ao longo do ano.
            </li>
            <li>
              <strong>20%</strong> avaliação de um júri escolhido por você.
            </li>
            <li>
              <strong>20%</strong> voto das famílias que contrataram pelo app.
            </li>
          </ul>
          <p className="body-text section-note">
            Use esta lista para escolher as finalistas. O selo <GoldSeal compact label="Babá de Família Rica" /> soma pontos de reconhecimento na pontuação.
          </p>
        </section>
        <section className="card">
          <h2 className="section-title">Como os níveis são definidos</h2>
          <ul className="plain-list">
            <li>
              <strong>Nova:</strong> menos de 3 avaliações.
            </li>
            <li>
              <strong>Prata:</strong> 3 avaliações ou mais.
            </li>
            <li>
              <strong>Ouro:</strong> nota a partir de 4,70, pelo menos 10 atendimentos nos últimos 12 meses e menos de 2% de
              cancelamentos.
            </li>
            <li>
              <strong>Elite:</strong> nota a partir de 4,85, pelo menos 25 atendimentos em 12 meses, 30% ou mais de recontratação,
              selo da mentoria e nenhuma suspensão no último ano.
            </li>
          </ul>
          <p className="muted small section-note">
            A nota é uma média ponderada (cuidado, pontualidade, comunicação, postura e apresentação) que começa perto da média do
            app e vai se ajustando conforme as avaliações chegam. Avaliações recentes valem mais.
          </p>
        </section>
      </div>
    </>
  );
}
