// Boas-vindas: a pessoa escolhe se é mãe ou babá.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { homeFor, useAuth } from '@/lib/auth';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Title } from '@/components/ui';
import { Chevron, Heart, Search } from '@/components/icons';
import { colors, fonts } from '@/theme';

function RoleCard({ title, text, bg, icon, onPress }: { title: string; text: string; bg: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      style={({ pressed }) => ({ backgroundColor: bg, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 96, opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.ink }}>{title}</Text>
        <Body muted size={14}>{text}</Body>
      </View>
      <Chevron />
    </Pressable>
  );
}

export default function Welcome() {
  const { session, profile, profileReady } = useAuth();
  const { papel } = useLocalSearchParams<{ papel?: string }>();
  if (session && !profileReady) return <View style={{ flex: 1, backgroundColor: colors.ivory }} />;
  if (session && profile) return <Redirect href={homeFor(profile.role)} />;
  if (session && !profile) return <Redirect href={{ pathname: '/cadastro', params: papel ? { papel } : {} }} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: '#E9D3A6', letterSpacing: 1 }}>BFR</Text>
          </View>
          <Title size={30} style={{ textAlign: 'center' }}>Babá de Família Rica</Title>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>por Ana Maldonado</Text>
        </View>

        <View style={{ marginTop: 56, gap: 6 }}>
          <Title size={34}>Que bom ter você aqui.</Title>
          <Body muted size={16}>Como você quer usar o app?</Body>
        </View>

        <View style={{ marginTop: 28, gap: 14 }}>
          <RoleCard title="Sou mãe" text="Quero encontrar uma babá com postura para a minha família" bg={colors.rose} icon={<Search size={26} />} onPress={() => router.push({ pathname: '/entrar', params: { papel: 'mae' } })} />
          <RoleCard title="Sou babá" text="Quero receber propostas de famílias que valorizam o meu trabalho" bg={colors.nude} icon={<Heart size={26} />} onPress={() => router.push({ pathname: '/entrar', params: { papel: 'baba' } })} />
        </View>

        <Pressable onPress={() => router.push('/entrar')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 14, marginTop: 18 }}>
          <Body muted size={15}>Já tem conta? <Text style={{ fontFamily: fonts.semibold, color: colors.plum }}>Entrar</Text></Body>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Body muted size={12} style={{ textAlign: 'center', marginTop: 32 }}>
          Ao continuar, você aceita os Termos de uso, a Política de privacidade e o Termo de confidencialidade.
        </Body>
      </ScrollView>
    </SafeAreaView>
  );
}
