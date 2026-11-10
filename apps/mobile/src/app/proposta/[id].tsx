// Nova proposta: dia, horário, duração, crianças e endereço. O total com taxas é calculado pela regra
// compartilhada e confirmado pelo banco (create_proposal).
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeFees, formatBRL } from '@bfr/shared';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorText } from '@/lib/bookings';
import { useNanny } from '@/lib/useNannies';
import { Field } from '@/components/Field';
import { Back, Check } from '@/components/icons';
import { Body, Button, Chip, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const DURATIONS = [2, 3, 4, 5, 6, 8, 10, 12];

function nextDays(n: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) out.push(new Date(d.getTime() + i * 86400000));
  return out;
}

export default function Proposta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = useNanny(id);
  const { isPremium, profile } = useAuth();
  const days = useMemo(() => nextDays(14), []);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(19);
  const [duration, setDuration] = useState(4);
  const [children, setChildren] = useState(1);
  const [ages, setAges] = useState('');
  const [area, setArea] = useState(profile?.neighborhood ?? '');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (!n) return <View style={{ flex: 1, backgroundColor: colors.ivory }} />;
  const isSample = n.id.startsWith('exemplo-');

  const starts = new Date(days[day].getTime() + hour * 3600000);
  const ends = new Date(starts.getTime() + duration * 3600000);
  const urgent = starts.getTime() - Date.now() < 24 * 3600000;
  const fees = computeFees({ hourlyRateCents: n.hourlyRateCents || 1, hours: duration, isRehire: false, familyIsPremium: isPremium, isUrgent: urgent });

  const submit = async () => {
    setError(null);
    if (!area.trim() || !address.trim()) return setError('Informe o bairro e o endereço.');
    const ageList = ages.split(/[^0-9]+/).filter(Boolean).map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x < 18);
    setBusy(true);
    const { data, error: err } = await supabase.rpc('create_proposal', {
      p_nanny: n.id, p_starts: starts.toISOString(), p_ends: ends.toISOString(), p_children: children,
      p_ages: ageList, p_area: [area.trim(), profile?.city].filter(Boolean).join(', '), p_address: address.trim(), p_notes: notes.trim() || null
    });
    setBusy(false);
    if (err) return setError(errorText(err));
    setSent(data as string);
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      <Strong size={16}>Nova proposta</Strong>
    </View>
  );

  if (isSample) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
        {header}
        <View style={{ padding: 24, gap: 14 }}>
          <Title size={28}>Este é um perfil de exemplo</Title>
          <Body muted>Ele mostra como as babás aparecem no app. Para enviar propostas reais, assine o Premium e veja as babás disponíveis na sua região.</Body>
          <Button label="Conhecer o Premium" onPress={() => router.replace('/premium')} />
        </View>
      </SafeAreaView>
    );
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' }}><Check size={34} /></View>
        <Title size={32} style={{ textAlign: 'center' }}>Proposta enviada</Title>
        <Body muted style={{ textAlign: 'center' }}>Avisamos a {n.name.split(' ')[0]}. Quando ela aceitar, você confirma o pagamento e a contratação fica garantida.</Body>
        <Button label="Ver minha contratação" onPress={() => router.replace({ pathname: '/contratacoes/[id]', params: { id: sent } })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Title size={26}>Proposta para {n.name}</Title>

          <View style={{ gap: 8 }}>
            <Strong>Dia</Strong>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => (
                <Chip key={i} active={i === day} onPress={() => setDay(i)}
                  label={i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} />
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 8 }}>
            <Strong>Começa às</Strong>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {HOURS.map((h) => <Chip key={h} label={`${h}h`} active={h === hour} onPress={() => setHour(h)} />)}
            </ScrollView>
          </View>
          <View style={{ gap: 8 }}>
            <Strong>Duração</Strong>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DURATIONS.map((h) => <Chip key={h} label={`${h} horas`} active={h === duration} onPress={() => setDuration(h)} />)}
            </ScrollView>
          </View>
          <View style={{ gap: 8 }}>
            <Strong>Crianças</Strong>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4].map((c) => <Chip key={c} label={String(c)} active={c === children} onPress={() => setChildren(c)} />)}
            </View>
          </View>
          <Field label="Idades das crianças" value={ages} onChangeText={setAges} placeholder="Ex.: 1 e 4" />
          <Field label="Bairro" value={area} onChangeText={setArea} placeholder="Ex.: Jardins" />
          <Field label="Endereço completo" value={address} onChangeText={setAddress} hint="A babá só vê o endereço 12 horas antes, com o pagamento confirmado." />
          <Field label="Recado para a babá (opcional)" value={notes} onChangeText={setNotes} multiline style={{ height: 90 }} />

          <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 10 }, shadow]}>
            <Body muted size={14}>{starts.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}, {hour}h às {ends.getHours()}h</Body>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>{duration}h × {formatBRL(n.hourlyRateCents)}</Body><Body size={14}>{formatBRL(fees.serviceCents)}</Body></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>Taxa de serviço e garantia ({Math.round(fees.familyFeeRate * 100)}%)</Body><Body size={14}>{formatBRL(fees.familyFeeCents)}</Body></View>
            {urgent && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Body muted size={14}>Pedido com menos de 24h</Body><Body size={14}>{formatBRL(fees.urgentFeeCents)}</Body></View>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Strong size={17}>Total</Strong><Strong size={17}>{formatBRL(fees.familyTotalCents)}</Strong></View>
            <Body muted size={12}>Você só paga depois que a babá aceitar. Se for uma recontratação, a taxa é menor e o valor final aparece na confirmação.</Body>
          </View>
          {error && <Strong size={14} style={{ color: '#B3261E' }}>{error}</Strong>}
          <Button label={busy ? 'Enviando…' : 'Enviar proposta'} onPress={submit} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
