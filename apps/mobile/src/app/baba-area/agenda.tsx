// Agenda da babá: atendimentos confirmados e em andamento (entrada e saída ficam no detalhe).
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listBookings, type Booking } from '@/lib/bookings';
import { BookingRow } from '@/components/BookingRow';
import { Calendar } from '@/components/icons';
import { Body, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Agenda() {
  const [items, setItems] = useState<Booking[] | null>(null);
  useFocusEffect(useCallback(() => { listBookings(['paga', 'em_andamento']).then(setItems); }, []));
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}>
        <Title size={30}>Agenda</Title>
        {items && items.length === 0 && (
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Calendar size={30} /></View>
            <Body muted style={{ textAlign: 'center', maxWidth: 290 }}>Seus atendimentos confirmados aparecem aqui. No dia, registre a entrada e a saída pelo app.</Body>
          </View>
        )}
        {(items ?? []).map((b) => <BookingRow key={b.id} b={b} asNanny />)}
        <Pressable onPress={() => router.push('/contratacoes')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
          <Body style={{ color: colors.plum }}>Ver histórico completo</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
