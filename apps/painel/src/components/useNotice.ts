"use client";

import { useCallback, useState } from "react";
import { friendlyError } from "@/lib/format";

type NoticeState = { kind: "ok" | "error"; message: string } | null;

/** Aviso de sucesso/erro das ações e controle de qual ação está em andamento. */
export function useActions() {
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(async (key: string, action: () => Promise<void>, okMessage: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "ok", message: okMessage });
      return true;
    } catch (err) {
      setNotice({ kind: "error", message: friendlyError(err) });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const show = useCallback((kind: "ok" | "error", message: string) => setNotice({ kind, message }), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  return { notice, show, clearNotice, busy, run };
}
