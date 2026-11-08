// Meu perfil (babá): status de aprovação, foto, dados editáveis e convite à mentoria.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import { supabase, signedUrl, friendlyError } from '@/lib/supabase';
import { GoldSeal, Portrait } from '@/components/Gold';
import { Field } from '@/components/Field';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

type Me = { is_published: boolean; hourly_rate_cents: number | null; bio: string | null; photo_path: string | null; years_experience: number | null };

export default function Perfil() {
  const { session, profile, signOut } = useAuth();
  const uid = session?.user.id;
  const [me, setMe] = useState<Me | null>(null);
  const [hasSeal, setHasSeal] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [rate, setRate] = useState('');
  const [bio, setBio] = useState('');
  const [years, setYears] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('nannies').select('is_published, hourly_rate_cents, bio, photo_path, years_experience').eq('id', uid).maybeSingle();
    if (!data) return;
    setMe(data);
    setRate(data.hourly_rate_cents ? String(data.hourly_rate_cents / 100).replace('.', ',') : '');
    setBio(data.bio ?? '');
    setYears(data.years_experience ? String(data.years_experience) : '');
    setPhoto(await signedUrl(data.photo_path));
    const { data: seal } = await supabase.from('nanny_seal_status').select('nanny_id').eq('nanny_id', uid).maybeSingle();
    setHasSeal(!!seal);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickPhoto = async () => {
    if (!uid) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (r.canceled) return;
    setBusy(true);
    const asset = r.assets[0];
    const body = await (await fetch(asset.uri)).arrayBuffer();
    const path = `${uid}/foto-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('perfis').upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg' });
    if (!error) await supabase.from('nannies').update({ photo_path: path }).eq('id', uid);
    setBusy(false);
    setMsg(error ? friendlyError(error.message) : 'Foto atualizada.');
    load();
  };

  const save = async () => {
    if (!uid) return;
    const cents = Math.round(parseFloat(rate.replace(',', '.')) * 100);
    if (!(cents > 0)) return setMsg('Informe seu valor por hora.');
    setBusy(true);
    const { error } = await supabase.from('nannies').update({
      hourly_rate_cents: cents, bio: bio.trim() || null, years_experience: years ? parseInt(years, 10) || null : null
    }).eq('id', uid);
    setBusy(false);
    setMsg(error ? friendlyError(error.message) : 'Dados salvos.');
  };

  const steps = [!!photo, !!bio.trim(), !!rate, !!years];
  const pct = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View>
          <Body muted size={14}>Olá, {profile?.first_name}</Body>
          <Title size={32}>Seu perfil está {pct}% pronto</Title>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} style={{ height: 10, borderRadius: 5, backgroundColor: colors.line }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.plum, width: `${pct}%` }} />
        </View>

        <View style={{ backgroundColor: me?.is_published ? colors.greenBg : '#FFF8E8', borderRadius: 18, padding: 14 }}>
          <Body size={14} style={{ color: me?.is_published ? colors.green : colors.ink }}>
            {me?.is_published ? 'Seu perfil está publicado e aparece para as famílias.' : 'Seu perfil está em análise. Ele aparece para as famílias depois da aprovação da equipe.'}
          </Body>
        </View>

        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 14, alignItems: 'center' }, shadow]}>
          <Portrait uri={photo ?? undefined} width={130} height={170} radius={24} gilded={hasSeal} label="Sua foto de perfil" />
          {hasSeal && <GoldSeal />}
          <Button label={photo ? 'Trocar foto' : 'Adicionar foto profissional'} variant="secondary" onPress={pickPhoto} disabled={busy} />
        </View>

        <Field label="Valor por hora (R$)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
        <Field label="Anos de experiência" value={years} onChangeText={setYears} keyboardType="number-pad" />
        <Field label="Sobre você" value={bio} onChangeText={setBio} multiline style={{ height: 120 }} hint="Experiência, idades com que trabalha, cursos e idiomas. Não coloque telefone nem redes sociais." />
        {msg && <Strong size={14} style={{ color: colors.plum }}>{msg}</Strong>}
        <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />

        {!hasSeal && (
          <Pressable onPress={() => router.push('/baba-area/mentoria')} accessibilityRole="button" style={{ backgroundColor: colors.plum, borderRadius: 24, padding: 18, gap: 4 }}>
            <Strong size={16} style={{ color: '#E9D3A6' }}>Conquiste o selo dourado</Strong>
            <Body size={13} style={{ color: '#F3E6EC' }}>Faça a Mentoria Babá de Família Rica e ganhe o anel dourado na sua foto.</Body>
          </Pressable>
        )}
        <Pressable onPress={async () => { await signOut(); router.replace('/'); }} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
          <Body style={{ color: colors.plum }}>Sair</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
