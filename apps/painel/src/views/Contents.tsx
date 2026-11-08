"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { CONTENT_BUCKET } from "@/lib/config";
import { formatDuration, friendlyError } from "@/lib/format";
import type { Audience, Content } from "@/lib/types";
import { useData } from "@/lib/useData";
import { useActions } from "@/components/useNotice";
import { Badge, Button, EmptyState, ErrorBox, Loading, Notice, PageHeader } from "@/components/ui";

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "maes", label: "Mães", hint: "Aparece para todas as mães" },
  { value: "babas", label: "Babás", hint: "Aparece para todas as babás" },
  { value: "mentoria", label: "Alunas da mentoria", hint: "Só para babás com selo ativo" },
];

const AUDIENCE_LABEL: Record<Audience, string> = { maes: "Mães", babas: "Babás", mentoria: "Mentoria" };

type FormState = {
  id: string | null;
  audience: Audience;
  category: string;
  title: string;
  minutes: string;
  seconds: string;
  sort_order: string;
  published: boolean;
  video_path: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  audience: "maes",
  category: "",
  title: "",
  minutes: "",
  seconds: "",
  sort_order: "0",
  published: false,
  video_path: null,
};

async function loadContents(): Promise<Content[]> {
  const { data, error } = await getSupabase()
    .from("contents")
    .select("id, audience, category, title, video_path, duration_seconds, sort_order, published, created_at")
    .order("audience")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Content[];
}

function toForm(c: Content): FormState {
  const d = c.duration_seconds ?? 0;
  return {
    id: c.id,
    audience: c.audience,
    category: c.category ?? "",
    title: c.title,
    minutes: d ? String(Math.floor(d / 60)) : "",
    seconds: d ? String(d % 60) : "",
    sort_order: String(c.sort_order),
    published: c.published,
    video_path: c.video_path,
  };
}

function extensionOf(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  return "mp4";
}

/** Lê a duração do vídeo no próprio navegador, sem enviar nada. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

export function Contents() {
  const { data, error, loading, reload } = useData(loadContents);
  const { notice, show, clearNotice, busy, run } = useActions();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Audience | "todos">("todos");
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const sb = getSupabase();

  const rows = useMemo(() => (data ?? []).filter((c) => filter === "todos" || c.audience === filter), [data, filter]);
  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((c) => c.category).filter((c): c is string => !!c))).sort(),
    [data],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFile(null);
    setFormError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function startEdit(c: Content) {
    resetForm();
    setForm(toForm(c));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onPickFile(f: File | null) {
    setFile(f);
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setFormError("Escolha um arquivo de vídeo (MP4, MOV ou WEBM).");
      return;
    }
    setFormError(null);
    const d = await readVideoDuration(f);
    if (d) setForm((prev) => ({ ...prev, minutes: String(Math.floor(d / 60)), seconds: String(d % 60) }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setFormError("Dê um título ao conteúdo.");
      return;
    }
    const min = form.minutes.trim() === "" ? 0 : Number(form.minutes);
    const sec = form.seconds.trim() === "" ? 0 : Number(form.seconds);
    if (!Number.isInteger(min) || !Number.isInteger(sec) || min < 0 || sec < 0 || sec > 59) {
      setFormError("Duração inválida: use minutos inteiros e segundos de 0 a 59.");
      return;
    }
    const order = Number(form.sort_order || "0");
    if (!Number.isInteger(order)) {
      setFormError("A ordem precisa ser um número inteiro (ex.: 1, 2, 3).");
      return;
    }
    if (file && !file.type.startsWith("video/")) {
      setFormError("Escolha um arquivo de vídeo (MP4, MOV ou WEBM).");
      return;
    }

    setSaving(true);
    setFormError(null);
    clearNotice();
    let uploadedPath: string | null = null;
    try {
      let video_path = form.video_path;
      if (file) {
        uploadedPath = `${form.audience}/${crypto.randomUUID()}.${extensionOf(file)}`;
        const up = await sb.storage.from(CONTENT_BUCKET).upload(uploadedPath, file, {
          contentType: file.type || "video/mp4",
          upsert: false,
        });
        if (up.error) throw up.error;
        video_path = uploadedPath;
      }
      const total = min * 60 + sec;
      const payload = {
        audience: form.audience,
        category: form.category.trim() || null,
        title,
        duration_seconds: total > 0 ? total : null,
        sort_order: order,
        published: form.published,
        video_path,
      };
      const { error } = form.id
        ? await sb.from("contents").update(payload).eq("id", form.id)
        : await sb.from("contents").insert(payload);
      if (error) throw error;

      // Trocou o vídeo: apaga o antigo para não acumular arquivos.
      if (file && form.video_path && form.video_path !== video_path) {
        await sb.storage.from(CONTENT_BUCKET).remove([form.video_path]);
      }
      const wasEdit = !!form.id;
      resetForm();
      reload();
      show("ok", wasEdit ? "Conteúdo atualizado." : "Conteúdo criado.");
    } catch (err) {
      if (uploadedPath) await sb.storage.from(CONTENT_BUCKET).remove([uploadedPath]);
      setFormError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(c: Content) {
    const ok = await run(
      `pub-${c.id}`,
      async () => {
        const { error } = await sb.from("contents").update({ published: !c.published }).eq("id", c.id);
        if (error) throw error;
      },
      c.published ? `“${c.title}” saiu do ar.` : `“${c.title}” foi publicado.`,
    );
    if (ok) reload();
  }

  async function remove(c: Content) {
    if (!window.confirm(`Excluir “${c.title}”? O vídeo também será apagado. Não dá para desfazer.`)) return;
    const ok = await run(
      `del-${c.id}`,
      async () => {
        const { error } = await sb.from("contents").delete().eq("id", c.id);
        if (error) throw error;
        if (c.video_path) await sb.storage.from(CONTENT_BUCKET).remove([c.video_path]);
      },
      `“${c.title}” foi excluído.`,
    );
    if (ok) {
      if (form.id === c.id) resetForm();
      reload();
    }
  }

  async function preview(c: Content) {
    if (!c.video_path) return;
    // Abre a aba já no clique (senão o navegador bloqueia) e depois coloca o link temporário.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    const ok = await run(
      `ver-${c.id}`,
      async () => {
        const { data: signed, error } = await sb.storage.from(CONTENT_BUCKET).createSignedUrl(c.video_path!, 3600);
        if (error) throw error;
        if (tab) tab.location.href = signed.signedUrl;
        else window.location.assign(signed.signedUrl);
      },
      "Vídeo aberto em outra aba.",
    );
    if (!ok) tab?.close();
  }

  return (
    <>
      <PageHeader title="Conteúdos" description="Vídeos e dicas para as mães, para as babás e para as alunas da mentoria." />

      {notice ? <Notice kind={notice.kind} message={notice.message} onClose={clearNotice} /> : null}

      <section className="card form-card" ref={formRef} aria-labelledby="form-title">
        <h2 id="form-title" className="section-title">
          {form.id ? "Editar conteúdo" : "Novo conteúdo"}
        </h2>
        <form className="form form-grid" onSubmit={onSubmit} noValidate>
          <div className="field span-2">
            <label htmlFor="c-title">Título</label>
            <input id="c-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Como se apresentar na primeira diária" />
          </div>

          <fieldset className="field span-2">
            <legend>Para quem</legend>
            <div className="choice-row">
              {AUDIENCES.map((a) => (
                <label key={a.value} className={form.audience === a.value ? "choice active" : "choice"}>
                  <input type="radio" name="audience" value={a.value} checked={form.audience === a.value} onChange={() => set("audience", a.value)} />
                  <span>
                    <strong>{a.label}</strong>
                    <small>{a.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="c-category">Categoria</label>
            <input id="c-category" list="c-categories" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Ex.: Postura" />
            <datalist id="c-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor="c-order">Ordem na lista</label>
            <input id="c-order" type="number" inputMode="numeric" step={1} value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            <span className="field-hint">Números menores aparecem primeiro.</span>
          </div>

          <div className="field span-2">
            <span className="label" id="c-video-label">
              Vídeo (opcional)
            </span>
            <div className="file-pick">
              <input
                id="c-video"
                ref={fileInput}
                className="sr-only"
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                aria-labelledby="c-video-label c-video-btn"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="c-video" id="c-video-btn" className="btn btn-secondary">
                {file || form.video_path ? "Trocar vídeo" : "Escolher vídeo"}
              </label>
              <span className="file-name">{file ? file.name : form.video_path ? "Vídeo já enviado" : "Nenhum arquivo escolhido"}</span>
            </div>
            <span className="field-hint">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB. Ele é enviado quando você salvar.`
                : form.video_path
                  ? "Já tem vídeo. Escolha outro arquivo só se quiser trocar."
                  : "MP4, MOV ou WEBM. A duração é preenchida sozinha."}
            </span>
          </div>

          <fieldset className="field">
            <legend>Duração</legend>
            <div className="duration">
              <label className="sr-only" htmlFor="c-min">
                Minutos
              </label>
              <input id="c-min" type="number" inputMode="numeric" min={0} value={form.minutes} onChange={(e) => set("minutes", e.target.value)} placeholder="0" />
              <span aria-hidden="true">min</span>
              <label className="sr-only" htmlFor="c-sec">
                Segundos
              </label>
              <input id="c-sec" type="number" inputMode="numeric" min={0} max={59} value={form.seconds} onChange={(e) => set("seconds", e.target.value)} placeholder="00" />
              <span aria-hidden="true">s</span>
            </div>
          </fieldset>

          <div className="field field-check">
            <label className="check">
              <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
              <span>Publicar agora</span>
            </label>
            <span className="field-hint">Sem marcar, fica como rascunho.</span>
          </div>

          {formError ? (
            <p className="form-error span-2" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="row-actions span-2">
            <Button type="submit" busy={saving}>
              {saving ? (file ? "Enviando vídeo…" : "Salvando…") : form.id ? "Salvar alterações" : "Criar conteúdo"}
            </Button>
            {form.id || form.title || file ? (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                {form.id ? "Cancelar edição" : "Limpar"}
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <div className="toolbar section-gap">
        <h2 className="section-title no-margin grow">Todos os conteúdos</h2>
        <div className="field field-inline">
          <label htmlFor="c-filter">Mostrar</label>
          <select id="c-filter" value={filter} onChange={(e) => setFilter(e.target.value as Audience | "todos")}>
            <option value="todos">Todos os públicos</option>
            <option value="maes">Mães</option>
            <option value="babas">Babás</option>
            <option value="mentoria">Mentoria</option>
          </select>
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title={data?.length ? "Nada para este público" : "Nenhum conteúdo ainda"}>
          {data?.length ? "Escolha outro público no filtro." : "Crie o primeiro vídeo ou dica no formulário acima."}
        </EmptyState>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Público</th>
                <th scope="col">Categoria</th>
                <th scope="col">Duração</th>
                <th scope="col">Ordem</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={form.id === c.id ? "row-editing" : undefined}>
                  <td data-label="Título" className="cell-strong">
                    {c.title}
                    {c.video_path ? null : (
                      <span className="cell-note">
                        <Badge tone="neutral">Sem vídeo</Badge>
                      </span>
                    )}
                  </td>
                  <td data-label="Público">{AUDIENCE_LABEL[c.audience]}</td>
                  <td data-label="Categoria">{c.category || "—"}</td>
                  <td data-label="Duração">{formatDuration(c.duration_seconds)}</td>
                  <td data-label="Ordem">{c.sort_order}</td>
                  <td data-label="Situação">{c.published ? <Badge tone="ok">Publicado</Badge> : <Badge tone="warn">Rascunho</Badge>}</td>
                  <td className="cell-actions">
                    <div className="row-actions">
                      <Button variant={c.published ? "secondary" : "primary"} busy={busy === `pub-${c.id}`} onClick={() => togglePublished(c)}>
                        {c.published ? "Despublicar" : "Publicar"}
                      </Button>
                      <Button variant="secondary" onClick={() => startEdit(c)}>
                        Editar
                      </Button>
                      {c.video_path ? (
                        <Button variant="ghost" busy={busy === `ver-${c.id}`} onClick={() => preview(c)}>
                          Ver vídeo
                        </Button>
                      ) : null}
                      <Button variant="danger" busy={busy === `del-${c.id}`} onClick={() => remove(c)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
