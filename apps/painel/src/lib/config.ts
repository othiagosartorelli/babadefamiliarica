// Endereço e chave PÚBLICA (publicável) do Supabase.
// A chave publicável pode ficar no código: quem protege os dados são as regras do banco (RLS).
// Nunca coloque aqui a chave secreta (service_role).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lhrvwkovsfkeqjicoxuk.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_n2nFWueB8E4TygNtr0prCw_VsYSseYA";

// Bucket de Storage onde ficam os vídeos dos conteúdos.
export const CONTENT_BUCKET = "conteudos";
