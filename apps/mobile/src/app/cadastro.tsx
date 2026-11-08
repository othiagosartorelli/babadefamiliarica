// Primeiro cadastro depois de criar a conta: dados básicos de mãe ou de babá.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, friendlyError } from '@/lib/supabase';
import { homeFor, useAuth, type Role } from '@/lib/auth';
import { Field } from '@/components/Field';
import { Check } from '@/components/icons';
import { Body, Button, Chip, Strong, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Cadastro() {
  const params = useLocalSearchParams<{ papel?: Role }>();
  const { session, refresh } = useAuth();
  const [role, setRole] = useState<Role>(params.papel === 'baba' ? 'baba' : 'mae');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [rate, setRate] = useState('');
  const [bio, setBio] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!session) return router.replace('/entrar');
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 2) return setError('Escreva nome e sobrenome.');
    if (!city.trim()) return setError('Informe sua cidade.');
    const rateCents = Math.round(parseFloat(rate.replace(',', '.')) * 100);
    if (role === 'baba' && !(rateCents > 0)) return setError('Informe seu valor por hora.');
    if (!accepted) return setError('Para continuar, aceite os termos.');
    setBusy(true);
    const uid = session.user.id;
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from('profiles').insert({
      id: uid, role, full_name: name, first_name: name.split(' ')[0], city: city.trim(), neighborhood: neighborhood.trim() || null,
      terms_accepted_at: now, confidentiality_accepted_at: now
    });
    if (e1 && !e1.message.includes('duplicate')) { setBusy(false); return setError(friendlyError(e1.message)); }
    const { error: e2 } = role === 'mae'
      ? await supabase.from('mothers').insert({ id: uid })
      : await supabase.from('nannies').insert({ id: uid, hourly_rate_cents: rateCents, bio: bio.trim() || null, modalities: ['avulso'] });
    if (e2 && !e2.message.includes('duplicate')) { setBusy(false); return setError(friendlyError(e2.message)); }
    if (role === 'baba') {
      // E-mail guardado em privado: liga o selo se ela já comprou a mentoria na Greenn.
      await supabase.from('nanny_private').upsert({ nanny_id: uid, email_lower: session.user.email?.toLowerCase() ?? null });
    }
    await refresh();
    setBusy(false);
    router.replace(homeFor(role));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Title size={32}>Conte um pouco sobre você</Title>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Sou mãe" active={role === 'mae'} onPress={() => setRole('mae')} />
            <Chip label="Sou babá" active={role === 'baba'} onPress={() => setRole('baba')} />
          </View>
          <Field label="Nome e sobrenome" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
          <Field label="Cidade" value={city} onChangeText={setCity} placeholder="Ex.: São Paulo" />
          <Field label={role === 'baba' ? 'Bairros que você atende' : 'Bairro'} value={neighborhood} onChangeText={setNeighborhood} placeholder={role === 'baba' ? 'Ex.: Pinheiros, Jardins' : 'Ex.: Jardins'} />
          {role === 'mae' && <Body muted size={13}>Seu perfil não aparece em buscas. Só a babá que você chamar vê seu nome.</Body>}
          {role === 'baba' && (
            <>
              <Field label="Valor por hora (R$)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Ex.: 65" />
              <Field label="Sobre você" value={bio} onChangeText={setBio} multiline style={{ height: 110 }} hint="Experiência, idades com que trabalha, cursos e idiomas." />
              <Body muted size={13}>Seu perfil aparece para as famílias depois da aprovação da equipe. Você pode completar foto, vídeo e verificação depois.</Body>
            </>
          )}
          <Pressable onPress={() => setAccepted((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.plum, backgroundColor: accepted ? colors.plum : colors.white, alignItems: 'center', justifyContent: 'center' }}>
              {accepted && <Check size={14} color={colors.white} strokeWidth={3} />}
            </View>
            <Body size={13} style={{ flex: 1 }}>Aceito os Termos de uso, a Política de privacidade e o Termo de confidencialidade, inclusive não postar as crianças nem combinar fora do app.</Body>
          </Pressable>
          {error && <Strong size={14} style={{ color: '#B3261E' }}>{error}</Strong>}
          <Button label={busy ? 'Salvando…' : 'Continuar'} onPress={save} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
