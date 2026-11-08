import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
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
      {onPress && <Chevron size={16} />}
    </Pressable>
  );
}

export default function Conta() {
  const { profile, session, isPremium, premiumUntil, signOut } = useAuth();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Title size={30}>{profile?.full_name ?? 'Minha conta'}</Title>
          <Body muted size={14}>{session?.user.email}</Body>
        </View>
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden' }, shadow]}>
          <Row title="Cidade" detail={[profile?.neighborhood, profile?.city].filter(Boolean).join(' · ') || 'Não informada'} />
          <Row title="Premium" detail={isPremium ? `Ativo até ${new Date(premiumUntil!).toLocaleDateString('pt-BR')}` : 'Não assinado'} onPress={() => router.push('/premium')} />
          <Row title="Verificação" detail="Documento, selfie e comprovante: pedimos na hora de contratar" />
          <Row title="Termos, privacidade e confidencialidade" detail="Aceitos no cadastro" />
        </View>
        <Pressable onPress={async () => { await signOut(); router.replace('/'); }} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
          <Body style={{ color: colors.plum }}>Sair</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
