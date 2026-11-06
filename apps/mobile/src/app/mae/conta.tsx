import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { isDemo } from '@/lib/supabase';
import { Chevron } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

function Row({ title, detail, onPress }: { title: string; detail?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flex: 1 }}>
        <Strong size={15}>{title}</Strong>
        {detail ? <Body muted size={13}>{detail}</Body> : null}
      </View>
      <Chevron size={16} />
    </Pressable>
  );
}

export default function Conta() {
  const { isPremium } = useStore();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Title size={30}>Minha conta</Title>
        {isDemo && (
          <View style={{ backgroundColor: colors.rose, borderRadius: 18, padding: 14 }}>
            <Body size={13}>Modo demonstração: os perfis são exemplos e nada é cobrado.</Body>
          </View>
        )}
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden' }, shadow]}>
          <Row title="Meus dados" detail="Nome, cidade e crianças" />
          <Row title="Verificação" detail="Documento, selfie e comprovante de residência" />
          <Row title="Premium" detail={isPremium ? 'Ativo · R$ 297/ano' : 'Não assinado'} onPress={() => !isPremium && router.push('/premium')} />
          <Row title="Contratações e recibos" />
          <Row title="Termos, privacidade e confidencialidade" />
          <Row title="Ajuda e pedidos de revisão" />
        </View>
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
          <Body style={{ color: colors.plum }}>Sair</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
