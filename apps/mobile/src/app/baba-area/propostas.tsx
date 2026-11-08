import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeFees, formatBRL } from '@bfr/shared';
import { Check, Star } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

export default function Propostas() {
  const [status, setStatus] = useState<'pendente' | 'aceita' | 'recusada'>('pendente');
  const fees = computeFees({ hourlyRateCents: 6500, hours: 4, isRehire: false, familyIsPremium: false });
  const line = (k: string, v: string, bold = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {bold ? <Strong size={17}>{k}</Strong> : <Body muted size={14}>{k}</Body>}
      {bold ? <Strong size={17}>{v}</Strong> : <Body size={14}>{v}</Body>}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Title size={32}>Propostas</Title>
          <Body muted size={14}>Quando uma família chamar você, a proposta aparece aqui. Abaixo, um exemplo de como ela chega.</Body>
        </View>
        <View style={[{ backgroundColor: colors.white, borderRadius: 26, padding: 18, gap: 16 }, shadow]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.nude, alignItems: 'center', justifyContent: 'center' }}><Title size={22}>C</Title></View>
            <View style={{ gap: 3 }}>
              <Strong size={17}>Exemplo · Carolina · Jardins</Strong>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={13} /><Body size={12} style={{ color: colors.green }}>Família verificada</Body></View>
            </View>
          </View>
          <View style={{ backgroundColor: colors.rose, borderRadius: 18, padding: 14, gap: 8 }}>
            <Body muted size={13}>O que outras babás dizem desta família</Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Star /><Strong>4,8 · 6 babás</Strong></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['Pagamento em dia', 'Respeita horários', 'Casa organizada'].map((t) => (
                <View key={t} style={{ backgroundColor: colors.ivory, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}><Body size={12}>{t}</Body></View>
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {line('Quando', 'Sáb, 15 nov · 19h às 23h')}
            {line('Crianças', '2 (1 e 4 anos)')}
            <View style={{ height: 1, backgroundColor: colors.line }} />
            {line('4h × R$ 65', formatBRL(fees.serviceCents))}
            {line(`Taxa da plataforma (${Math.round(fees.nannyFeeRate * 100)}%)`, '− ' + formatBRL(fees.nannyFeeCents))}
            {line('Você recebe', formatBRL(fees.nannyPayoutCents), true)}
            <Body muted size={12}>Repasse em até 2 dias úteis após o atendimento. Na recontratação pela mesma família, a taxa cai para 8%.</Body>
          </View>
          {status === 'pendente' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Recusar" variant="secondary" onPress={() => setStatus('recusada')} style={{ flex: 1 }} />
              <Button label="Aceitar proposta" onPress={() => setStatus('aceita')} style={{ flex: 2 }} />
            </View>
          )}
          {status === 'aceita' && <View style={{ backgroundColor: colors.greenBg, borderRadius: 16, padding: 12 }}><Body size={14} style={{ color: colors.green }}>Proposta aceita. Avisaremos você assim que a Carolina pagar.</Body></View>}
          {status === 'recusada' && <View style={{ backgroundColor: colors.rose, borderRadius: 16, padding: 12 }}><Body size={14}>Tudo bem. Recusar não afeta sua nota.</Body></View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
