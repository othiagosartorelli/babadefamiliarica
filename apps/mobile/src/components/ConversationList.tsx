// Lista de conversas (mãe ou babá), com as do banco e, para a mãe, a conversa de exemplo.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { fetchConversations, type ConversationItem } from '@/lib/data';
import { Portrait } from './Gold';
import { Body, Strong, Title } from './ui';
import { colors, shadow } from '@/theme';

export function ConversationList({ showDemo }: { showDemo: boolean }) {
  const { session } = useAuth();
  const { chats } = useStore();
  const [items, setItems] = useState<ConversationItem[]>([]);
  useFocusEffect(useCallback(() => { fetchConversations().then(setItems); }, []));
  const me = session?.user.id;
  const demo = showDemo ? SAMPLE_NANNIES.filter((n) => (chats[n.id] ?? []).length > 0) : [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Title size={30}>Mensagens</Title>
        {items.length === 0 && demo.length === 0 && <Body muted>Suas conversas aparecem aqui.</Body>}
        {items.map((c) => {
          const iAmMother = c.mother_id === me;
          const name = iAmMother ? c.nanny_full_name ?? 'Babá' : c.mother_first_name ?? 'Família';
          return (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })} accessibilityRole="button"
              style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, shadow]}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}>
                <Strong size={20} style={{ color: colors.plum }}>{name.charAt(0)}</Strong>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Strong>{name}</Strong>
                <Body muted size={13}>{c.last_body ? (c.last_body.length > 60 ? c.last_body.slice(0, 60) + '…' : c.last_body) : 'Nova conversa'}</Body>
              </View>
            </Pressable>
          );
        })}
        {demo.map((n) => {
          const last = chats[n.id][chats[n.id].length - 1];
          return (
            <Pressable key={n.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: n.id } })} accessibilityRole="button"
              style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, shadow]}>
              <Portrait source={n.photo} width={52} height={52} radius={26} gilded={n.hasSeal} label={`Foto de ${n.name}`} />
              <View style={{ flex: 1, gap: 2 }}>
                <Strong>{n.name} · exemplo</Strong>
                <Body muted size={13}>{last.text.length > 60 ? last.text.slice(0, 60) + '…' : last.text}</Body>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
