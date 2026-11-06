import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useStore } from '@/lib/store';
import { NannyCardView } from '@/components/NannyCardView';
import { Body, SealInfoSheet, Title } from '@/components/ui';
import { Heart } from '@/components/icons';
import { colors } from '@/theme';

export default function Favoritas() {
  const { favorites, toggleFavorite } = useStore();
  const [info, setInfo] = useState(false);
  const list = SAMPLE_NANNIES.filter((n) => favorites.has(n.id));
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, flexGrow: 1 }}>
        <Title size={30}>Favoritas</Title>
        {list.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Heart size={30} /></View>
            <Body muted style={{ textAlign: 'center', maxWidth: 280 }}>Ainda não há favoritas. Toque no coração dos perfis que tocarem seu coração.</Body>
          </View>
        ) : (
          list.map((n) => <NannyCardView key={n.id} n={n} favorite onFavorite={() => toggleFavorite(n.id)} onSealInfo={() => setInfo(true)} />)
        )}
      </ScrollView>
      <SealInfoSheet visible={info} onClose={() => setInfo(false)} />
    </SafeAreaView>
  );
}
