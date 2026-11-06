// Perfil da babá visto pela mãe.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatBRL } from '@bfr/shared';
import { SAMPLE_NANNIES } from '@/data/sample';
import { GoldSeal, Portrait } from '@/components/Gold';
import { Back, Check } from '@/components/icons';
import { Body, Button, Strong, Title, VerifiedBadge } from '@/components/ui';
import { colors, fonts, shadow } from '@/theme';

export default function NannyProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = SAMPLE_NANNIES.find((x) => x.id === id);
  const [sealOpen, setSealOpen] = useState(false);
  if (!n) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16 }}>
        <Title>Perfil não encontrado</Title>
        <Button label="Voltar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 300, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
          <Portrait source={n.photo} width={168} height={224} radius={28} gilded={n.hasSeal} label={`Foto de ${n.name}`} />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 16 }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <Back />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={{ padding: 20, gap: 22 }}>
          <View style={{ gap: 8 }}>
            <Title size={34}>{n.name}, {n.age}</Title>
            <Body muted size={14}>{n.place} · responde em ~1h</Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {n.hasSeal && <GoldSeal size="md" onInfo={() => setSealOpen((v) => !v)} />}
              {n.verified && <VerifiedBadge />}
            </View>
            {n.hasSeal && sealOpen && (
              <View style={{ backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#E8D29E', borderRadius: 18, padding: 14 }}>
                <Body size={14}>
                  O selo dourado é dado às babás que concluíram a <Text style={{ fontFamily: fonts.bold }}>Mentoria Babá de Família Rica com Ana Maldonado</Text>: postura, apresentação, comunicação e discrição com famílias de alto padrão.{n.sealSince ? ` ${n.name.split(' ')[0]} concluiu em ${n.sealSince}.` : ''}
                </Body>
              </View>
            )}
          </View>

          {n.rating !== null && n.reviews >= 3 && (
            <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 12 }, shadow]}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Title size={40}>{n.rating.toFixed(1).replace('.', ',')}</Title>
                <Body muted size={14}>{n.reviews} avaliações · {n.rehired} famílias voltaram</Body>
              </View>
              {n.criteria.map((c) => (
                <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${c.label}: ${c.value} de 5`}>
                  <Body size={13} style={{ width: 150 }}>{c.label}</Body>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.plum, width: `${(c.value / 5) * 100}%` }} />
                  </View>
                  <Strong size={13}>{c.value.toFixed(1).replace('.', ',')}</Strong>
                </View>
              ))}
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Strong size={17}>Sobre mim</Strong>
            <Body>{n.bio}</Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {n.tags.map((t) => (
                <View key={t} style={{ backgroundColor: colors.rose, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}><Body size={13}>{t}</Body></View>
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Strong size={17}>O que verificamos</Strong>
            {n.checks.map((k) => (
              <View key={k.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' }}><Check size={14} strokeWidth={2.6} /></View>
                <Body size={14} style={{ flex: 1 }}>{k.label}</Body>
                <Body muted size={12}>{k.date}</Body>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>{formatBRL(n.hourlyRateCents).replace(',00', '')} <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }}>/hora</Text></Text>
            <Body muted size={12}>Pagamento protegido no app</Body>
          </View>
          <Button label="Enviar proposta" onPress={() => router.push({ pathname: '/proposta/[id]', params: { id: n.id } })} />
        </View>
      </SafeAreaView>
    </View>
  );
}
