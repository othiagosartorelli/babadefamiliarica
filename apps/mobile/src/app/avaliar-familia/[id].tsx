// A babá avalia a família. A mãe nunca vê; só outras babás que ela chamar.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { FAMILY_TAGS, getBooking, type Booking } from '@/lib/bookings';
import { Check, Star } from '@/components/icons';
import { Body, Button, Chip, Strong, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function AvaliarFamilia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [b, setB] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (id) getBooking(id).then(setB); }, [id]);

  const submit = async () => {
    if (!b || !session || !rating) return;
    setBusy(true);
    const { error: err } = await supabase.from('family_reviews').insert({ booking_id: b.id, nanny_id: session.user.id, mother_id: b.mother_id, rating, tags });
    setBusy(false);
    if (err) return setError('Não foi possível enviar. Talvez esta contratação já tenha sido avaliada.');
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' }}><Check size={34} /></View>
        <Title size={32} style={{ textAlign: 'center' }}>Obrigada!</Title>
        <Body muted style={{ textAlign: 'center' }}>Sua avaliação ajuda outras babás. A família não vê o que você escreveu.</Body>
        <Button label="Voltar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Title size={28}>Como foi com a família de {b?.mother?.first_name ?? '…'}?</Title>
        <Body muted size={14}>Só outras babás chamadas por esta família veem sua avaliação. A família nunca vê.</Body>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} de 5`} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Star size={34} fill={rating >= n ? colors.plum : 'none'} />
            </Pressable>
          ))}
        </View>
        <Strong>O que se destacou?</Strong>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(FAMILY_TAGS).map(([k, label]) => (
            <Chip key={k} label={label} active={tags.includes(k)} onPress={() => setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))} />
          ))}
        </View>
        {error && <Strong size={14} style={{ color: '#B3261E' }}>{error}</Strong>}
        <Button label={busy ? 'Enviando…' : 'Enviar avaliação'} onPress={submit} disabled={!rating || busy} />
      </ScrollView>
    </SafeAreaView>
  );
}
