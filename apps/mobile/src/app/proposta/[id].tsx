// Proposta e pagamento: total com taxas calculado pela regra compartilhada.
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeFees, formatBRL } from '@bfr/shared';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useStore } from '@/lib/store';
import { Back, Check, Lock } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const METHODS = ['Pix', 'Cartão', 'Apple Pay'] as const;

export default function Proposta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = SAMPLE_NANNIES.find((x) => x.id === id) ?? SAMPLE_NANNIES[0];
  const { isPremium } = useStore();
  const [method, setMethod] = useState<(typeof METHODS)[number]>('Pix');
  const [paid, setPaid] = useState(false);
  const hours = 4;
  const fees = computeFees({ hourlyRateCents: n.hourlyRateCents, hours, isRehire: false, familyIsPremium: isPremium });

  if (paid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' }}><Check size={34} /></View>
        <Title size={34} style={{ textAlign: 'center' }}>Tudo certo para sábado</Title>
        <Body muted style={{ textAlign: 'center' }}>A {n.name.split(' ')[0]} já recebeu a confirmação. Combine os detalhes pelo chat do app.</Body>
        <Button label="Abrir o chat" onPress={() => router.replace({ pathname: '/chat/[id]', params: { id: n.id } })} />
      </SafeAreaView>
    );
  }

  const rows: [string, string][] = [
    ['Quando', 'Sáb, 15 nov · 19h às 23h'],
    ['Onde', 'Jardins, São Paulo'],
    ['Crianças', '2 (1 e 4 anos)']
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
        <Strong size={16}>Revise e pague</Strong>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Title size={26}>Proposta para {n.name}</Title>
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 10 }, shadow]}>
          {rows.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>{k}</Body><Body size={14}>{v}</Body></View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>{hours} horas × {formatBRL(n.hourlyRateCents)}</Body><Body size={14}>{formatBRL(fees.serviceCents)}</Body></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>Taxa de serviço e garantia ({Math.round(fees.familyFeeRate * 100)}%)</Body><Body size={14}>{formatBRL(fees.familyFeeCents)}</Body></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Strong size={17}>Total</Strong><Strong size={17}>{formatBRL(fees.familyTotalCents)}</Strong></View>
        </View>

        <View style={{ backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Lock color={colors.green} /><Strong>Pagamento protegido</Strong></View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {METHODS.map((m) => (
              <Pressable key={m} onPress={() => setMethod(m)} accessibilityRole="radio" accessibilityState={{ selected: method === m }}
                style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: method === m ? 2 : 1, borderColor: method === m ? colors.plum : colors.border, backgroundColor: method === m ? colors.rose : colors.white }}>
                <Strong size={14}>{m}</Strong>
              </Pressable>
            ))}
          </View>
          <Body muted size={13}>O valor fica guardado e só é liberado para a {n.name.split(' ')[0]} depois do atendimento.</Body>
        </View>

        <Body muted size={13}>
          Cancelamento grátis até 48h antes. Depois, 50% vai para a babá; a menos de 24h, 100%. O contato direto é liberado quando o prazo de cancelamento grátis termina.
        </Body>
      </ScrollView>
      <View style={{ padding: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button label={`Pagar ${formatBRL(fees.familyTotalCents)} com ${method}`} onPress={() => setPaid(true)} />
      </View>
    </SafeAreaView>
  );
}
