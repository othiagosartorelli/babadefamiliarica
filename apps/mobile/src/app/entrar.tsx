// Entrar ou criar conta com e-mail e senha.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, friendlyError } from '@/lib/supabase';
import { type Role } from '@/lib/auth';
import { Field } from '@/components/Field';
import { Back } from '@/components/icons';
import { Body, Button, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Entrar() {
  const { papel } = useLocalSearchParams<{ papel?: Role }>();
  const [mode, setMode] = useState<'criar' | 'entrar'>(papel ? 'criar' : 'entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async () => {
    setError(null);
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError('Confira o e-mail.');
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    if (mode === 'criar') {
      const { data, error: err } = await supabase.auth.signUp({ email: e, password });
      setBusy(false);
      if (err) return setError(friendlyError(err.message));
      if (!data.session) return setCheckEmail(true);
      router.replace({ pathname: '/cadastro', params: { papel: papel ?? 'mae' } });
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (err) return setError(friendlyError(err.message));
      // A tela inicial espera o perfil carregar e leva para a área certa (ou para o cadastro).
      router.replace({ pathname: '/', params: papel ? { papel } : {} });
    }
  };

  if (checkEmail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Title size={32}>Confira seu e-mail</Title>
        <Body muted>Enviamos um link de confirmação para {email.trim()}. Depois de confirmar, volte aqui e entre com seu e-mail e senha.</Body>
        <Button label="Já confirmei, entrar" onPress={() => { setCheckEmail(false); setMode('entrar'); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 8 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Title size={32}>{mode === 'criar' ? (papel === 'baba' ? 'Crie sua conta de babá' : 'Crie sua conta') : 'Que bom te ver de novo'}</Title>
          <Body muted>{mode === 'criar' ? 'Leva menos de um minuto.' : 'Entre com seu e-mail e senha.'}</Body>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="voce@email.com" />
          <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} textContentType={mode === 'criar' ? 'newPassword' : 'password'} hint={mode === 'criar' ? 'Pelo menos 8 caracteres.' : undefined} error={error} onSubmitEditing={submit} />
          <Button label={busy ? 'Aguarde…' : mode === 'criar' ? 'Criar conta' : 'Entrar'} onPress={submit} disabled={busy} />
          <Pressable onPress={() => { setMode(mode === 'criar' ? 'entrar' : 'criar'); setError(null); }} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
            <Body style={{ color: colors.plum }}>{mode === 'criar' ? 'Já tenho conta' : 'Ainda não tenho conta'}</Body>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
