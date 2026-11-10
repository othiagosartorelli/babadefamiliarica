import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { formatBRL } from '@bfr/shared';
import { fmtDateRange, STATUS_LABEL, type Booking } from '@/lib/bookings';
import { Body, Strong } from './ui';
import { colors, shadow } from '@/theme';

export function BookingRow({ b, asNanny }: { b: Booking; asNanny: boolean }) {
  const who = asNanny ? `${b.mother?.first_name ?? 'Família'} · ${b.area_label}` : b.nanny?.full_name ?? 'Babá';
  const value = asNanny ? b.service_cents - b.nanny_fee_cents : b.service_cents + b.family_fee_cents + b.urgent_fee_cents;
  const active = ['proposta', 'aceita', 'paga', 'em_andamento'].includes(b.status);
  return (
    <Pressable onPress={() => router.push({ pathname: '/contratacoes/[id]', params: { id: b.id } })} accessibilityRole="button"
      style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 4 }, shadow]}>
      <Strong size={16}>{who}</Strong>
      <Body muted size={14}>{fmtDateRange(b.starts_at, b.ends_at)}</Body>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <View style={{ backgroundColor: active ? colors.rose : colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Body size={12} style={{ color: active ? colors.plum : colors.muted }}>{STATUS_LABEL[b.status]}</Body>
        </View>
        <Strong size={15}>{formatBRL(value)}</Strong>
      </View>
    </Pressable>
  );
}
