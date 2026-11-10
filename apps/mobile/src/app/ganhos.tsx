// Ganhos da babá: recebidos, a receber e histórico.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatBRL } from '@bfr/shared';
import { listBookings, fmtDateRange, type Booking } from '@/lib/bookings';
import { Back } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

export default function Ganhos() {
  const [items, setItems] = useState<Booking[]>([]);
  useFocusEffect(useCallback(() => { listBookings(['concluida', 'cancelada']).then(setItems); }, []));
  const net = (b: Booking) => (b.status === 'cancelada' ? b.nanny_cancel_share_cents : b.service_cents - b.nanny_fee_cents);
  const now = Date.now();
  const earned = items.filter((b) => net(b) > 0);
  const received = earned.filter((b) => b.payout_at && new Date(b.payout_at).getTime() <= now).reduce((s, b) => s + net(b), 0);
  const pending = earned.filter((b) => !b.payout_at || new Date(b.payout_at).getTime() > now).reduce((s, b) => s + net(b), 0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ paddingHorizontal: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 14 }}>
        <Title size={30}>Ganhos</Title>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[{ flex: 1, backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 4 }, shadow]}>
            <Body muted size={13}>Recebido</Body>
            <Strong size={20}>{formatBRL(received)}</Strong>
          </View>
          <View style={[{ flex: 1, backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 4 }, shadow]}>
            <Body muted size={13}>A receber</Body>
            <Strong size={20}>{formatBRL(pending)}</Strong>
          </View>
        </View>
        <Body muted size={13}>O repasse sai em até 2 dias úteis depois do atendimento. Taxa da plataforma: 12% na primeira contratação com cada família e 8% nas seguintes.</Body>
        <View style={{ backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#E8D29E', borderRadius: 16, padding: 12 }}>
          <Body size={13}>Fase de testes: os pagamentos são simulados e nenhum valor é transferido.</Body>
        </View>
        {earned.length === 0 && <Body muted>Seus ganhos aparecem aqui depois do primeiro atendimento.</Body>}
        {earned.map((b) => (
          <Pressable key={b.id} onPress={() => router.push({ pathname: '/contratacoes/[id]', params: { id: b.id } })} accessibilityRole="button"
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ flex: 1 }}>
              <Strong size={14}>{b.mother?.first_name ?? 'Família'}{b.status === 'cancelada' ? ' · cancelamento' : ''}</Strong>
              <Body muted size={13}>{fmtDateRange(b.starts_at, b.ends_at)}</Body>
            </View>
            <Strong size={15}>{formatBRL(net(b))}</Strong>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
