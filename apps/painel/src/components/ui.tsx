import type { ButtonHTMLAttributes, ReactNode } from "react";

export function CrownIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill={color} />
    </svg>
  );
}

/** Selo dourado da Mentoria Babá de Família Rica. */
export function GoldSeal({ compact = false, label }: { compact?: boolean; label?: string }) {
  return (
    <span className={compact ? "seal seal-compact" : "seal"}>
      <CrownIcon size={compact ? 13 : 15} color="#3E1C2F" />
      <span>{label ?? (compact ? "Selo ativo" : "Babá de Família Rica")}</span>
    </span>
  );
}

type Tone = "neutral" | "ok" | "plum" | "warn";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  busy = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
      {children ? <div className="page-header-actions">{children}</div> : null}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <CrownIcon size={22} color="#B8956A" />
      <p className="empty-title">{title}</p>
      {children ? <p className="empty-text">{children}</p> : null}
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner spinner-dark" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

export function Notice({ kind, message, onClose }: { kind: "ok" | "error"; message: string; onClose: () => void }) {
  return (
    <div className={`alert ${kind === "ok" ? "alert-ok" : "alert-error"}`} role={kind === "ok" ? "status" : "alert"}>
      <span>{message}</span>
      <button type="button" className="alert-close" onClick={onClose} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}
