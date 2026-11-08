"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { friendlyError } from "./format";

type State<T> = { data: T | null; error: string | null; loading: boolean };

/**
 * Carrega dados no navegador e permite recarregar depois de uma ação.
 * `key` muda quando a consulta muda (ex.: um filtro). O carregamento lança erro quando a consulta falha.
 */
export function useData<T>(load: () => Promise<T>, key = "") {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    let alive = true;
    runLoad()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (alive) setState((s) => ({ data: s.data, error: friendlyError(err), loading: false }));
      });
    return () => {
      alive = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
