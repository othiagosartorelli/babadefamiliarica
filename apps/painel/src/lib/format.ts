const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Traduz erros do Supabase para mensagens claras em português. */
export function friendlyError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  const msg = raw.toLowerCase();
  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("email not confirmed")) return "Este e-mail ainda não foi confirmado. Confira a caixa de entrada.";
  if (msg.includes("too many") || msg.includes("rate limit"))
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed"))
    return "Não foi possível conectar. Verifique a internet e tente de novo.";
  if (msg.includes("jwt") || msg.includes("session")) return "Sua sessão expirou. Saia e entre de novo.";
  if (msg.includes("row-level security") || msg.includes("permission denied"))
    return "O banco recusou esta alteração (permissão). Avise o suporte técnico.";
  if (msg.includes("payload too large") || msg.includes("exceeded the maximum allowed size"))
    return "O arquivo é grande demais para o envio. Tente um vídeo menor.";
  return raw ? `Algo deu errado: ${raw}` : "Algo deu errado. Tente de novo.";
}
