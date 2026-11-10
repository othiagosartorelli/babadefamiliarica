// Lista de contratações (mãe ou babá).
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { listBookings, type Booking } from '@/lib/bookings';
import { BookingRow } from '@/components/BookingRow';
import { Back } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Contratacoes() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Booking[] | null>(null);
  useFocusEffect(useCallback(() => { listBookings().then(setItems); }, []));
  const asNanny = profile?.role === 'baba';
  const upcoming = (items ?? []).filter((b) => ['proposta', 'aceita', 'paga', 'em_andamento'].includes(b.status));
  const past = (items ?? []).filter((b) => !upcoming.includes(b)).reverse();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ paddingHorizontal: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}>
        <Title size={30}>Contratações</Title>
        {items && items.length === 0 && <Body muted>Nenhuma contratação ainda.</Body>}
        {upcoming.length > 0 && <Strong size={15} style={{ marginTop: 6 }}>Em andamento</Strong>}
        {upcoming.map((b) => <BookingRow key={b.id} b={b} asNanny={asNanny} />)}
        {past.length > 0 && <Strong size={15} style={{ marginTop: 10 }}>Histórico</Strong>}
        {past.map((b) => <BookingRow key={b.id} b={b} asNanny={asNanny} />)}
      </ScrollView>
    </SafeAreaView>
  );
}
