"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/format";
import { one, type Role } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { Badge, Button, EmptyState, ErrorBox, Loading, Notice, PageHeader } from "@/components/ui";

const DOCS_BUCKET = "documentos";
const LINK_SECONDS = 600; // 10 minutos

type Kind = "identidade" | "antecedentes" | "endereco" | "curso" | "referencia";
type Status = "pendente" | "aprovado" | "reprovado" | "em_revisao" | "expirado";

type VerificationRow = {
  id: string;
  user_id: string;
  kind: Kind;
  status: Status;
  summary: string | null;
  document_paths: string[];
  created_at: string;
  verified_at: string | null;
  expires_at: string | null;
  person: { full_name: string; role: Role } | null;
};

const KIND_LABEL: Record<Kind, string> = {
  identidade: "Identidade",
  antecedentes: "Antecedentes criminais",
  endereco: "Comprovante de endereço",
  curso: "Curso",
  referencia: "Referência",
};

const ROLE_LABEL: Record<Role, string> = { mae: "Mãe", baba: "Babá", admin: "Administração" };

type View = "pendentes" | "decididas";

async function loadVerifications(view: View): Promise<VerificationRow[]> {
  let q = getSupabase()
    .from("verifications")
    .select("id, user_id, kind, status, summary, document_paths, created_at, verified_at, expires_at, person:profiles(full_name, role)");
  q =
    view === "pendentes"
      ? q.eq("status", "pendente").order("created_at", { ascending: true })
      : q.in("status", ["aprovado", "reprovado"]).order("created_at", { ascending: false }).limit(50);
  const { data, error } = await q;
  if (error) throw error;
  type Raw = Omit<VerificationRow, "person"> & { person: VerificationRow["person"] | VerificationRow["person"][] };
  return ((data ?? []) as unknown as Raw[]).map((v) => ({ ...v, document_paths: v.document_paths ?? [], person: one(v.person) }));
}

/** Validade da verificação: antecedentes valem 12 meses; os demais, 24. */
function expiryFor(kind: Kind): string {
  const d = new Date();
  d.setMonth(d.getMonth() + (kind === "antecedentes" ? 12 : 24));
  return d.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function Verifications() {
  const [view, setView] = useState<View>("pendentes");
  return (
    <>
      <PageHeader
        title="Verificações"
        description="Confira os documentos enviados pelas babás e mães e aprove ou reprove cada verificação."
      />
      <section className="card soft-card">
        <h2 className="section-title">Privacidade (LGPD)</h2>
        <p className="body-text">
          Os documentos ficam guardados em uma área privada só até a sua análise. Assim que você aprovar ou reprovar, os arquivos
          são apagados de vez e fica registrado apenas o resultado (aprovado ou reprovado, a data e o motivo). Os links para ver
          os documentos valem por 10 minutos e não devem ser compartilhados.
        </p>
      </section>
      <div className="segmented" role="group" aria-label="Filtrar verificações">
        <button type="button" aria-pressed={view === "pendentes"} className={view === "pendentes" ? "seg active" : "seg"} onClick={() => setView("pendentes")}>
          Pendentes
        </button>
        <button type="button" aria-pressed={view === "decididas"} className={view === "decididas" ? "seg active" : "seg"} onClick={() => setView("decididas")}>
          Decididas
        </button>
      </div>
      <VerificationList key={view} view={view} />
    </>
  );
}

function VerificationList({ view }: { view: View }) {
  const { data, error, loading, reload } = useData(() => loadVerifications(view), view);
  const { notice, show, clearNotice, busy, run } = useActions();
  const [links, setLinks] = useState<Record<string, { url: string; name: string }[]>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const sb = getSupabase();

  async function openDocs(v: VerificationRow) {
    await run(
      `docs-${v.id}`,
      async () => {
        const { data: signed, error } = await sb.storage.from(DOCS_BUCKET).createSignedUrls(v.document_paths, LINK_SECONDS);
        if (error) throw error;
        const list: { url: string; name: string }[] = [];
        for (const s of signed ?? []) {
          if (!s.signedUrl) continue;
          const ext = s.path?.split(".").pop()?.toUpperCase();
          list.push({ url: s.signedUrl, name: `Documento ${list.length + 1}${ext ? ` (${ext})` : ""}` });
        }
        if (list.length === 0) throw new Error("Os arquivos não foram encontrados. Talvez já tenham sido apagados.");
        setLinks((l) => ({ ...l, [v.id]: list }));
      },
      "Links prontos. Eles valem por 10 minutos.",
    );
  }

  /** Apaga os arquivos e zera a lista. Se falhar, a lista fica para tentar de novo em “Decididas”. */
  async function purgeFiles(v: VerificationRow) {
    if (v.document_paths.length === 0) return;
    const { error: rmError } = await sb.storage.from(DOCS_BUCKET).remove(v.document_paths);
    if (rmError) throw new Error(`A decisão foi salva, mas os arquivos não foram apagados: ${rmError.message}. Use “Apagar arquivos” em Decididas.`);
    const { error } = await sb.from("verifications").update({ document_paths: [] }).eq("id", v.id);
    if (error) throw error;
  }

  async function decide(v: VerificationRow, status: "aprovado" | "reprovado") {
    const name = v.person?.full_name ?? "esta pessoa";
    const motivo = reason.trim();
    if (status === "reprovado" && !motivo) {
      show("error", "Escreva o motivo da reprovação. Ele aparece para a pessoa.");
      return;
    }
    if (status === "aprovado" && !window.confirm(`Aprovar a verificação de ${KIND_LABEL[v.kind].toLowerCase()} de ${name}? Os documentos serão apagados.`)) return;
    const ok = await run(
      `${status}-${v.id}`,
      async () => {
        const patch =
          status === "aprovado"
            ? { status, verified_at: nowIso(), expires_at: expiryFor(v.kind) }
            : { status, summary: motivo, verified_at: null, expires_at: null };
        const { error } = await sb.from("verifications").update(patch).eq("id", v.id);
        if (error) throw error;
        await purgeFiles(v);
      },
      status === "aprovado" ? `Verificação de ${name} aprovada e documentos apagados.` : `Verificação de ${name} reprovada e documentos apagados.`,
    );
    setLinks((l) => {
      const next = { ...l };
      delete next[v.id];
      return next;
    });
    if (status === "reprovado" && ok) {
      setRejecting(null);
      setReason("");
    }
    reload();
  }

  async function purgeOnly(v: VerificationRow) {
    const ok = await run(`purge-${v.id}`, () => purgeFiles(v), "Arquivos apagados.");
    if (ok) reload();
  }

  return (
    <>
      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title={view === "pendentes" ? "Nenhuma verificação esperando você" : "Nenhuma verificação decidida ainda"}>
          {view === "pendentes"
            ? "Quando alguém enviar documentos pelo app, eles aparecem aqui."
            : "As verificações que você aprovar ou reprovar ficam listadas aqui."}
        </EmptyState>
      ) : (
        <div className="stack">
          {data.map((v) => (
            <article key={v.id} className="card appeal">
              <header className="appeal-head">
                <div>
                  <p className="appeal-name">{v.person?.full_name ?? "Pessoa sem nome"}</p>
                  <p className="muted small">
                    {v.person ? ROLE_LABEL[v.person.role] : "—"} · enviado em {formatDateTime(v.created_at)}
                  </p>
                </div>
                <div className="appeal-badges">
                  <Badge tone="plum">{KIND_LABEL[v.kind] ?? v.kind}</Badge>
                  {v.status === "aprovado" ? <Badge tone="ok">Aprovada</Badge> : null}
                  {v.status === "reprovado" ? <Badge tone="warn">Reprovada</Badge> : null}
                </div>
              </header>

              {view === "pendentes" ? (
                <>
                  <div className="docs">
                    {v.document_paths.length === 0 ? (
                      <p className="muted small">Nenhum arquivo anexado a este pedido.</p>
                    ) : links[v.id] ? (
                      <ul className="doc-links">
                        {links[v.id].map((d) => (
                          <li key={d.url}>
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                              Abrir {d.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Button variant="secondary" busy={busy === `docs-${v.id}`} onClick={() => openDocs(v)}>
                        Ver documentos ({v.document_paths.length})
                      </Button>
                    )}
                  </div>

                  {rejecting === v.id ? (
                    <div className="field reject-box">
                      <label htmlFor={`motivo-${v.id}`}>Motivo da reprovação</label>
                      <textarea
                        id={`motivo-${v.id}`}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex.: A foto do documento está ilegível. Envie de novo com boa luz."
                      />
                      <span className="field-hint">A pessoa vê este motivo no app.</span>
                    </div>
                  ) : null}

                  <footer className="appeal-foot">
                    <p className="muted small">Ao decidir, os arquivos são apagados.</p>
                    <div className="row-actions">
                      {rejecting === v.id ? (
                        <>
                          <Button variant="ghost" disabled={!!busy} onClick={() => { setRejecting(null); setReason(""); }}>
                            Cancelar
                          </Button>
                          <Button variant="secondary" busy={busy === `reprovado-${v.id}`} disabled={!!busy} onClick={() => decide(v, "reprovado")}>
                            Confirmar reprovação
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" disabled={!!busy} onClick={() => { setRejecting(v.id); setReason(""); }}>
                            Reprovar
                          </Button>
                          <Button busy={busy === `aprovado-${v.id}`} disabled={!!busy} onClick={() => decide(v, "aprovado")}>
                            Aprovar
                          </Button>
                        </>
                      )}
                    </div>
                  </footer>
                </>
              ) : (
                <dl className="appeal-grid">
                  <div>
                    <dt>{v.status === "aprovado" ? "Aprovada em" : "Resultado"}</dt>
                    <dd>{v.status === "aprovado" ? formatDate(v.verified_at) : "Reprovada"}</dd>
                  </div>
                  <div>
                    <dt>{v.status === "aprovado" ? "Válida até" : "Motivo"}</dt>
                    <dd>{v.status === "aprovado" ? formatDate(v.expires_at) : v.summary || "—"}</dd>
                  </div>
                  {v.document_paths.length > 0 ? (
                    <div className="appeal-claim">
                      <dt>Arquivos ainda guardados</dt>
                      <dd>
                        <span className="body-text">Os arquivos desta verificação não foram apagados. </span>
                        <Button variant="danger" busy={busy === `purge-${v.id}`} onClick={() => purgeOnly(v)}>
                          Apagar arquivos
                        </Button>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
