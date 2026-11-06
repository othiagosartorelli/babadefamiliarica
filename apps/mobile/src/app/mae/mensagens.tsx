import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useStore } from '@/lib/store';
import { Portrait } from '@/components/Gold';
import { Body, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

export default function Mensagens() {
  const { chats } = useStore();
  const threads = SAMPLE_NANNIES.filter((n) => (chats[n.id] ?? []).length > 0);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Title size={30}>Mensagens</Title>
        {threads.length === 0 && <Body muted>Suas conversas com as babás aparecem aqui.</Body>}
        {threads.map((n) => {
          const last = chats[n.id][chats[n.id].length - 1];
          return (
            <Pressable key={n.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: n.id } })} accessibilityRole="button"
              style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, shadow]}>
              <Portrait source={n.photo} width={52} height={52} radius={26} gilded={n.hasSeal} label={`Foto de ${n.name}`} />
              <View style={{ flex: 1, gap: 2 }}>
                <Strong>{n.name}</Strong>
                <Body muted size={13} style={{}}>{last.text.length > 60 ? last.text.slice(0, 60) + '…' : last.text}</Body>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
