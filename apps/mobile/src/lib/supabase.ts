import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

// Sessão guardada no cofre seguro do aparelho (no navegador, no localStorage).
const storage =
  Platform.OS === 'web'
    ? {
        getItem: async (k: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
        setItem: async (k: string, v: string) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); },
        removeItem: async (k: string) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); }
      }
    : {
        getItem: (k: string) => SecureStore.getItemAsync(k),
        setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        removeItem: (k: string) => SecureStore.deleteItemAsync(k)
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

// Fotos e vídeos ficam em buckets privados: o app pede um link temporário.
export async function signedUrl(path: string | null | undefined, bucket = 'perfis'): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function friendlyError(message?: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Toque em "Já tenho conta" para entrar.';
  if (m.includes('password should be') || m.includes('weak')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos e tente de novo.';
  if (m.includes('rate limit')) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (m.includes('network')) return 'Sem conexão. Verifique a internet e tente de novo.';
  return 'Algo não saiu como esperado. Tente de novo em instantes.';
}
