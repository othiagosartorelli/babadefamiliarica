// Conteúdos publicados pela Ana no painel (vídeos e dicas), por público.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Chip, Body, Strong } from './ui';
import { colors, shadow } from '@/theme';
import Svg, { Path } from 'react-native-svg';

export type Content = { id: string; title: string; category: string | null; video_path: string | null; duration_seconds: number | null };

function Play({ color = colors.plum }: { color?: string }) {
  return <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M8 5l11 7-11 7z" fill={color} /></Svg>;
}

export function useContents(audience: 'maes' | 'babas' | 'mentoria') {
  const [items, setItems] = useState<Content[] | null>(null);
  useFocusEffect(useCallback(() => {
    supabase.from('contents').select('id, title, category, video_path, duration_seconds').eq('audience', audience).eq('published', true)
      .order('sort_order').order('created_at').then(({ data }) => setItems((data as Content[]) ?? []));
  }, [audience]));
  return items;
}

const dur = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

export function ContentList({ items, empty, numbered }: { items: Content[] | null; empty: string; numbered?: boolean }) {
  const [cat, setCat] = useState('Todos');
  const cats = ['Todos', ...Array.from(new Set((items ?? []).map((c) => c.category).filter(Boolean) as string[]))];
  const list = (items ?? []).filter((c) => cat === 'Todos' || c.category === cat);
  const open = (c: Content) => c.video_path && router.push({ pathname: '/video', params: { path: c.video_path, title: c.title } });
  if (items && items.length === 0) {
    return <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18 }, shadow]}><Body muted size={14}>{empty}</Body></View>;
  }
  return (
    <View style={{ gap: 12 }}>
      {cats.length > 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {cats.map((c) => <Chip key={c} label={c} active={c === cat} onPress={() => setCat(c)} />)}
        </ScrollView>
      )}
      {list.map((c, i) => (
        <Pressable key={c.id} onPress={() => open(c)} accessibilityRole="button" accessibilityLabel={`Assistir: ${c.title}`}
          style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 12, flexDirection: 'row', gap: 14, alignItems: 'center' }, shadow]}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: i % 2 ? colors.nude : colors.rose, alignItems: 'center', justifyContent: 'center' }}><Play /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Strong size={15}>{numbered ? `Aula ${i + 1} · ` : ''}{c.title}</Strong>
            <Body muted size={13}>{[c.category, dur(c.duration_seconds)].filter(Boolean).join(' · ') || 'Vídeo'}</Body>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
