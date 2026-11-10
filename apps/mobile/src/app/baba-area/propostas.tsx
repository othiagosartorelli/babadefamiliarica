// Propostas recebidas (babá).
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listBookings, type Booking } from '@/lib/bookings';
import { BookingRow } from '@/components/BookingRow';
import { Mail } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Propostas() {
  const [pending, setPending] = useState<Booking[] | null>(null);
  const [waiting, setWaiting] = useState<Booking[]>([]);
  useFocusEffect(useCallback(() => {
    listBookings(['proposta']).then(setPending);
    listBookings(['aceita']).then(setWaiting);
  }, []));
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}>
        <Title size={30}>Propostas</Title>
        {pending && pending.length === 0 && waiting.length === 0 && (
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Mail size={30} /></View>
            <Body muted style={{ textAlign: 'center', maxWidth: 290 }}>Quando uma família chamar você, a proposta aparece aqui. Perfis completos, com foto e vídeo, recebem mais propostas.</Body>
          </View>
        )}
        {(pending ?? []).length > 0 && <Strong size={15}>Uma família quer conhecer você</Strong>}
        {(pending ?? []).map((b) => <BookingRow key={b.id} b={b} asNanny />)}
        {waiting.length > 0 && <Strong size={15} style={{ marginTop: 10 }}>Aceitas, aguardando pagamento</Strong>}
        {waiting.map((b) => <BookingRow key={b.id} b={b} asNanny />)}
      </ScrollView>
    </SafeAreaView>
  );
}
