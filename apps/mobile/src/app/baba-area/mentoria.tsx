// Aba "Ana" da babá: aulas da mentoria (para quem tem o selo) ou o convite para comprar,
// e as dicas gerais da Ana para babás.
import { useCallback, useState } from 'react';
import { AppState, Linking, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GREENN_CHECKOUT_URL } from '@/lib/config';
import { ContentList, useContents } from '@/components/ContentList';
import { GoldSeal } from '@/components/Gold';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Mentoria() {
  const { session } = useAuth();
  const [hasSeal, setHasSeal] = useState<boolean | null>(null);
  const lessons = useContents('mentoria');
  const tips = useContents('babas');

  const check = useCallback(() => {
    if (!session) return;
    supabase.from('nanny_seal_status').select('nanny_id').eq('nanny_id', session.user.id).maybeSingle().then(({ data }) => setHasSeal(!!data));
  }, [session]);
  // Ao voltar do checkout da Greenn, o app confere de novo se o selo já foi liberado.
  useFocusEffect(useCallback(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]));

  const buy = () => {
    if (!GREENN_CHECKOUT_URL) return;
    const url = new URL(GREENN_CHECKOUT_URL);
    if (session?.user.email) url.searchParams.set('email', session.user.email);
    Linking.openURL(url.toString());
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={{ backgroundColor: colors.plum, borderRadius: 26, padding: 20, gap: 12 }}>
          <Body size={13} style={{ color: '#E9D3A6', letterSpacing: 1.5 }}>MENTORIA</Body>
          <Title size={28} style={{ color: colors.white }}>Babá de Família Rica com Ana Maldonado</Title>
          <Body size={15} style={{ color: '#F3E6EC' }}>Postura, apresentação e comunicação para trabalhar com famílias de alto padrão.</Body>
          <GoldSeal size="md" />
          {hasSeal && <Body size={13} style={{ color: '#E9D3A6' }}>Você já tem o selo dourado. Ele aparece no seu perfil para todas as famílias.</Body>}
        </View>

        {hasSeal ? (
          <>
            <Strong size={17}>Aulas</Strong>
            <ContentList items={lessons} numbered empty="As aulas da mentoria estão sendo gravadas. Elas aparecem aqui assim que forem publicadas." />
          </>
        ) : hasSeal === false ? (
          <View style={{ gap: 10 }}>
            <Button label="Quero o selo dourado · R$ 1.497" onPress={buy} disabled={!GREENN_CHECKOUT_URL} />
            <Body muted size={12} style={{ textAlign: 'center' }}>
              {GREENN_CHECKOUT_URL
                ? 'No Pix ou em até 12x no cartão (com juros da plataforma). Pagamento seguro pela Greenn. Use o mesmo e-mail desta conta: ao voltar para o app, as aulas e o selo já estão liberados.'
                : 'A venda da mentoria pelo app abre em breve. Já comprou pela Ana? Use o mesmo e-mail da compra nesta conta e o selo aparece sozinho.'}
            </Body>
          </View>
        ) : null}

        <Strong size={17}>Dicas da Ana para babás</Strong>
        <ContentList items={tips} empty="Em breve, dicas da Ana sobre postura, rotina e comunicação com as famílias." />
      </ScrollView>
    </SafeAreaView>
  );
}
