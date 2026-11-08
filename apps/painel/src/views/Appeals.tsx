"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { one, type ModerationAction, type Role } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { Badge, Button, EmptyState, ErrorBox, Loading, Notice, PageHeader } from "@/components/ui";

type Status = "aberto" | "mantido" | "revertido";

type AppealRow = {
  id: string;
  claim: string;
  status: Status;
  created_at: string;
  decided_at: string | null;
  user_id: string;
  event: {
    id: string;
    action: ModerationAction;
    reason: string;
    ai_summary: string | null;
    review_id: string | null;
    created_at: string;
  } | null;
  requester: { full_name: string; role: Role; suspended_until: string | null; banned_at: string | null } | null;
};

const ACTION_LABEL: Record<ModerationAction, string> = {
  aviso: "Aviso",
  suspensao: "Suspensão",
  banimento: "Banimento",
  mensagem_oculta: "Mensagem ocultada",
  avaliacao_removida: "Avaliação removida",
};

const ROLE_LABEL: Record<Role, string> = { mae: "Mãe", baba: "Babá", admin: "Administração" };

async function loadAppeals(view: "abertos" | "decididos"): Promise<AppealRow[]> {
  let q = getSupabase()
    .from("appeals")
    .select(
      "id, claim, status, created_at, decided_at, user_id, event:moderation_events(id, action, reason, ai_summary, review_id, created_at), requester:profiles!appeals_user_id_fkey(full_name, role, suspended_until, banned_at)",
    );
  q = view === "abertos" ? q.eq("status", "aberto").order("created_at", { ascending: true }) : q.neq("status", "aberto").order("decided_at", { ascending: false }).limit(50);
  const { data, error } = await q;
  if (error) throw error;
  type Raw = Omit<AppealRow, "event" | "requester"> & {
    event: AppealRow["event"] | AppealRow["event"][];
    requester: AppealRow["requester"] | AppealRow["requester"][];
  };
  return ((data ?? []) as unknown as Raw[]).map((a) => ({ ...a, event: one(a.event), requester: one(a.requester) }));
}

function revertHint(action: ModerationAction | undefined): string {
  switch (action) {
    case "suspensao":
      return "Reverter encerra a suspensão agora.";
    case "banimento":
      return "Reverter desfaz o banimento e a conta volta a funcionar.";
    case "avaliacao_removida":
      return "Reverter devolve a avaliação ao perfil.";
    case "mensagem_oculta":
      return "Reverter registra a decisão. A mensagem continua oculta no chat.";
    default:
      return "Reverter registra que o aviso foi desconsiderado.";
  }
}

export function Appeals() {
  const [view, setView] = useState<"abertos" | "decididos">("abertos");
  return (
    <>
      <PageHeader
        title="Pedidos de revisão"
        description="A IA modera as conversas e avaliações no dia a dia. Aqui chegam só os casos em que a pessoa pediu revisão."
      />

      <div className="segmented" role="group" aria-label="Filtrar pedidos">
        <button type="button" aria-pressed={view === "abertos"} className={view === "abertos" ? "seg active" : "seg"} onClick={() => setView("abertos")}>
          Abertos
        </button>
        <button type="button" aria-pressed={view === "decididos"} className={view === "decididos" ? "seg active" : "seg"} onClick={() => setView("decididos")}>
          Decididos
        </button>
      </div>
      <AppealsList key={view} view={view} />
    </>
  );
}

function AppealsList({ view }: { view: "abertos" | "decididos" }) {
  const { data, error, loading, reload } = useData(() => loadAppeals(view), view);
  const { notice, clearNotice, busy, run } = useActions();
  const sb = getSupabase();

  async function decide(a: AppealRow, status: "mantido" | "revertido") {
    const name = a.requester?.full_name ?? "esta pessoa";
    const question =
      status === "mantido"
        ? `Manter a decisão da IA para ${name}?`
        : `Reverter a decisão para ${name}? ${revertHint(a.event?.action)}`;
    if (!window.confirm(question)) return;

    const ok = await run(
      `${status}-${a.id}`,
      async () => {
        // Uma operação só no banco (decide_appeal): desfaz o efeito e fecha o pedido juntos, ou nada muda.
        const { error } = await sb.rpc("decide_appeal", { p_appeal_id: a.id, p_status: status });
        if (error) throw error;
      },
      status === "mantido" ? `Decisão mantida para ${name}.` : `Decisão revertida para ${name}.`,
    );
    if (ok) reload();
  }

  return (
    <>
      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title={view === "abertos" ? "Nenhum pedido esperando você" : "Nenhum pedido decidido ainda"}>
          {view === "abertos" ? "Quando alguém contestar uma decisão da IA, o pedido aparece aqui." : "As decisões que você tomar ficam listadas aqui."}
        </EmptyState>
      ) : (
        <div className="stack">
          {data.map((a) => (
            <article key={a.id} className="card appeal">
              <header className="appeal-head">
                <div>
                  <p className="appeal-name">{a.requester?.full_name ?? "Pessoa sem nome"}</p>
                  <p className="muted small">
                    {a.requester ? ROLE_LABEL[a.requester.role] : "—"} · pediu em {formatDateTime(a.created_at)}
                  </p>
                </div>
                <div className="appeal-badges">
                  {a.event ? <Badge tone={a.event.action === "banimento" || a.event.action === "suspensao" ? "warn" : "neutral"}>{ACTION_LABEL[a.event.action]}</Badge> : null}
                  {a.status !== "aberto" ? <Badge tone={a.status === "revertido" ? "ok" : "plum"}>{a.status === "revertido" ? "Revertido" : "Mantido"}</Badge> : null}
                </div>
              </header>

              <dl className="appeal-grid">
                <div>
                  <dt>Motivo da decisão</dt>
                  <dd>{a.event?.reason ?? "—"}</dd>
                </div>
                <div>
                  <dt>Resumo da IA</dt>
                  <dd>{a.event?.ai_summary || <span className="muted">Sem resumo</span>}</dd>
                </div>
                <div className="appeal-claim">
                  <dt>O que a pessoa diz</dt>
                  <dd>“{a.claim}”</dd>
                </div>
              </dl>

              {a.status === "aberto" ? (
                <footer className="appeal-foot">
                  <p className="muted small">{revertHint(a.event?.action)}</p>
                  <div className="row-actions">
                    <Button variant="secondary" busy={busy === `mantido-${a.id}`} disabled={!!busy} onClick={() => decide(a, "mantido")}>
                      Manter decisão
                    </Button>
                    <Button busy={busy === `revertido-${a.id}`} disabled={!!busy} onClick={() => decide(a, "revertido")}>
                      Reverter
                    </Button>
                  </div>
                </footer>
              ) : (
                <p className="muted small">Decidido em {formatDateTime(a.decided_at)}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
