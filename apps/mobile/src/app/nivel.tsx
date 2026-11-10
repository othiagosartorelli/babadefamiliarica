// Meu nível (babá): Nova → Prata → Ouro → Elite, com o que falta para subir.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GoldSurface } from '@/components/Gold';
import { Back, Crown } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

type Stats = { level: 'nova' | 'prata' | 'ouro' | 'elite'; rating: number | null; review_count: number; rehire_rate: number; ranking_score: number };

const LEVELS = [
  { key: 'nova', name: 'Nova', rule: 'Menos de 3 avaliações. Seu perfil aparece como "Nova · Verificada".' },
  { key: 'prata', name: 'Prata', rule: 'A partir de 3 avaliações.' },
  { key: 'ouro', name: 'Ouro', rule: 'Nota 4,7 ou mais, 10 atendimentos em 12 meses e quase nenhum cancelamento.' },
  { key: 'elite', name: 'Elite', rule: 'Nota 4,85 ou mais, 25 atendimentos em 12 meses, 30% de famílias que voltam e selo dourado.' }
] as const;

export default function Nivel() {
  const { session } = useAuth();
  const [s, setS] = useState<Stats | null>(null);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('nannies').select('level, rating, review_count, rehire_rate, ranking_score').eq('id', session.user.id).maybeSingle().then(({ data }) => setS(data as Stats));
  }, [session]));
  const idx = LEVELS.findIndex((l) => l.key === s?.level);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ paddingHorizontal: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16 }}>
        <Title size={30}>Meu nível</Title>
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 8 }, shadow]}>
          <Body muted size={13}>Nível atual</Body>
          <Title size={34}>{LEVELS[Math.max(idx, 0)].name}</Title>
          <Body size={14}>
            {s?.review_count ? `Nota ${Number(s.rating).toFixed(2).replace('.', ',')} · ${s.review_count} ${s.review_count === 1 ? 'avaliação' : 'avaliações'} · ${Math.round(s.rehire_rate * 100)}% das famílias voltaram` : 'Ainda sem avaliações.'}
          </Body>
          <Body muted size={13}>Sua posição no ranking é privada. Ela considera nota, famílias que voltam, pontualidade nas respostas, cancelamentos, selos e perfil completo.</Body>
        </View>
        {LEVELS.map((l, i) => (
          <View key={l.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', opacity: i <= idx ? 1 : 0.75 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i <= idx ? colors.plum : colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <Strong size={12} style={{ color: i <= idx ? colors.white : colors.muted }}>{i + 1}</Strong>
            </View>
            <View style={{ flex: 1 }}><Strong>{l.name}</Strong><Body muted size={13}>{l.rule}</Body></View>
          </View>
        ))}
        <GoldSurface width={360} style={{ borderRadius: 22, padding: 18 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Crown size={22} />
            <View style={{ flex: 1 }}>
              <Strong style={{ color: colors.goldText }}>Babá do Ano</Strong>
              <Body size={13} style={{ color: colors.goldText }}>As babás Elite concorrem na premiação anual da Ana: 60% pontuação, 20% júri e 20% voto das famílias.</Body>
            </View>
          </View>
        </GoldSurface>
      </ScrollView>
    </SafeAreaView>
  );
}
