import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sessão guardada no cofre seguro do aparelho.
const storage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k)
};

// Sem as variáveis, o app roda em modo demonstração com os perfis de exemplo.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }) : null;

export const isDemo = supabase === null;
