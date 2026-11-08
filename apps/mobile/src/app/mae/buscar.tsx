// Busca da mãe: contexto do atendimento, filtro do selo dourado, perfis e o convite ao premium.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/lib/auth';
import { useNannyList } from '@/lib/useNannies';
import { NannyCardView } from '@/components/NannyCardView';
import { Body, Button, Chip, SealInfoSheet, Title } from '@/components/ui';
import { GoldSurface } from '@/components/Gold';
import { Calendar, Crown, Lock } from '@/components/icons';
import { colors, fonts, shadow } from '@/theme';

export default function Buscar() {
  const { profile } = useAuth();
  const { nannies, loading, isPremium, isFavorite, toggleFavorite } = useNannyList();
  const [sealOnly, setSealOnly] = useState(false);
  const [info, setInfo] = useState(false);
  const list = nannies.filter((n) => !sealOnly || n.hasSeal);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} stickyHeaderIndices={[]}>
        <View style={{ gap: 2 }}>
          <Body muted size={14}>Olá, {profile?.first_name ?? 'tudo bem'}</Body>
          <Title size={30}>Quem vai cuidar com você?</Title>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Editar data, horário e crianças" style={[{ backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: '#EADDD6', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, shadow]}>
          <Calendar />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>Sáb, 15 nov · 19h às 23h</Text>
            <Body muted size={13}>2 crianças (1 e 4 anos) · Jardins, São Paulo</Body>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.plum }}>Editar</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={() => setSealOnly((v) => !v)} accessibilityRole="button" accessibilityState={{ selected: sealOnly }}>
            {sealOnly ? (
              <GoldSurface width={180} style={{ height: 36, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Crown size={15} /><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.goldText }}>Só com selo dourado</Text></View>
              </GoldSurface>
            ) : (
              <View style={{ height: 36, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1.5, borderColor: '#C9A04F', backgroundColor: colors.white }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Crown size={15} /><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.goldText }}>Só com selo dourado</Text></View>
              </View>
            )}
          </Pressable>
          <Chip label="Bilíngue" />
          <Chip label="Filtros" />
        </ScrollView>

        <Body muted size={13}>
          {loading ? 'Carregando…' : isPremium ? `${list.length} babás disponíveis` : 'Perfis de exemplo · assine para ver todas as babás da sua região'}
        </Body>

        {list.map((n) => (
          <NannyCardView key={n.id} n={n} favorite={isFavorite(n.id)} onFavorite={() => toggleFavorite(n.id)} onSealInfo={() => setInfo(true)} />
        ))}

        {!isPremium && (
          <View style={{ borderRadius: 24, overflow: 'hidden', minHeight: 230 }}>
            <View style={{ gap: 12 }} importantForAccessibility="no-hide-descendants">
              <View style={{ height: 110, borderRadius: 24, backgroundColor: colors.rose }} />
              <View style={{ height: 110, borderRadius: 24, backgroundColor: colors.nude }} />
            </View>
            <BlurView intensity={30} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' }}><Lock color="#E9D3A6" /></View>
              <Title size={24} style={{ textAlign: 'center' }}>Veja todas as babás disponíveis no seu dia</Title>
              <Button label="Desbloquear todas" onPress={() => router.push('/premium')} />
            </BlurView>
          </View>
        )}
      </ScrollView>
      <SealInfoSheet visible={info} onClose={() => setInfo(false)} />
    </SafeAreaView>
  );
}
