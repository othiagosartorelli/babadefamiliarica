// A mãe avalia a babá: 5 critérios, comentário obrigatório e nota privada para a equipe.
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getBooking, type Booking } from '@/lib/bookings';
import { Field } from '@/components/Field';
import { Heart, Star } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const CRITERIA = [
  { key: 'care', label: 'Cuidado com a criança' },
  { key: 'punctuality', label: 'Pontualidade' },
  { key: 'communication', label: 'Comunicação' },
  { key: 'posture', label: 'Postura' },
  { key: 'presentation', label: 'Apresentação pessoal' }
] as const;

export default function Avaliar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [b, setB] = useState<Booking | null>(null);
  const [r, setR] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (id) getBooking(id).then(setB); }, [id]);

  const len = comment.trim().length;
  const ready = CRITERIA.every((c) => r[c.key]) && len >= 40;

  const submit = async () => {
    if (!b || !session || !ready) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.from('nanny_reviews').insert({
      booking_id: b.id, mother_id: session.user.id, nanny_id: b.nanny_id,
      care: r.care, punctuality: r.punctuality, communication: r.communication, posture: r.posture, presentation: r.presentation,
      comment: comment.trim()
    }).select('id').single();
    if (!err && note.trim()) await supabase.from('review_private_notes').insert({ review_id: data.id, note: note.trim() });
    setBusy(false);
    if (err) return setError('Não foi possível enviar. Talvez esta contratação já tenha sido avaliada.');
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Heart size={32} fill={colors.plum} /></View>
        <Title size={32} style={{ textAlign: 'center' }}>Obrigada!</Title>
        <Body muted style={{ textAlign: 'center' }}>Sua avaliação será publicada quando a babá também avaliar, ou em até 14 dias.</Body>
        <Button label="Voltar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Title size={28}>Como foi com {b?.nanny?.first_name ?? 'a babá'}?</Title>
          <View style={[{ backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 6 }, shadow]}>
            {CRITERIA.map((c, i) => (
              <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < CRITERIA.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                <Body size={14} style={{ flex: 1 }}>{c.label}</Body>
                <View style={{ flexDirection: 'row' }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setR((x) => ({ ...x, [c.key]: n }))} accessibilityRole="button" accessibilityLabel={`${c.label}: ${n} de 5`} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={22} fill={(r[c.key] ?? 0) >= n ? colors.plum : 'none'} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
          <Field label="Conte para outras mães (obrigatório)" value={comment} onChangeText={setComment} multiline style={{ height: 110 }}
            hint={len >= 40 ? 'Pronto' : `Mínimo de 40 caracteres · faltam ${40 - len}`} />
          <Field label="Algo só para a equipe? (opcional)" value={note} onChangeText={setNote} multiline style={{ height: 70 }} hint="Ninguém mais vê." />
          {error && <Strong size={14} style={{ color: '#B3261E' }}>{error}</Strong>}
          <Button label={busy ? 'Enviando…' : 'Enviar avaliação'} onPress={submit} disabled={!ready || busy} />
          <Body muted size={12} style={{ textAlign: 'center' }}>A babá também avalia você. As duas avaliações aparecem juntas.</Body>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
