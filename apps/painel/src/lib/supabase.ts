"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

// Um único cliente para o painel inteiro. A sessão fica guardada no navegador.
// Tudo roda com a sessão da Ana: as regras do banco (RLS) decidem o que ela vê e altera.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "bfr-painel-auth",
      },
    });
  }
  return client;
}
