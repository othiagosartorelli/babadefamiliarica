import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SAMPLE_NANNIES, type NannyCard } from '@/data/sample';
import { useAuth } from './auth';
import { useStore } from './store';
import { fetchFavoriteIds, fetchNannies, setFavorite } from './data';

// Lista para a mãe: babás reais que a regra do banco libera + os exemplos embutidos para quem não é premium.
export function useNannyList() {
  const { session, isPremium } = useAuth();
  const store = useStore();
  const [live, setLive] = useState<NannyCard[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, favs] = await Promise.all([fetchNannies(), fetchFavoriteIds()]);
    setLive(list);
    setFavIds(new Set(favs));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nannies = isPremium ? live : [...live, ...SAMPLE_NANNIES];
  const isFavorite = (id: string) => (id.startsWith('exemplo-') ? store.favorites.has(id) : favIds.has(id));
  const toggleFavorite = async (id: string) => {
    if (id.startsWith('exemplo-')) return store.toggleFavorite(id);
    if (!session) return;
    const on = !favIds.has(id);
    setFavIds((prev) => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    await setFavorite(session.user.id, id, on);
  };
  return { nannies, loading, isPremium, isFavorite, toggleFavorite, reload: load };
}

export function useNanny(id: string | undefined) {
  const sample = SAMPLE_NANNIES.find((n) => n.id === id);
  const [nanny, setNanny] = useState<NannyCard | null | undefined>(sample ?? undefined);
  useEffect(() => {
    if (!id || sample) return;
    fetchNannies([id]).then((l) => setNanny(l[0] ?? null));
  }, [id, sample]);
  return nanny; // undefined = carregando, null = não encontrada
}
