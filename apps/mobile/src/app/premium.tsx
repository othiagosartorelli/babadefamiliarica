// Premium da mãe (R$ 297/ano). A compra pela loja (App Store / Google Play) entra no lançamento;
// na fase de testes, a equipe libera premium de teste pelo painel.
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Body, Button, Strong, Title } from '@/components/ui';
import { Check, Crown } from '@/components/icons';
import { GoldSurface } from '@/components/Gold';
import { colors } from '@/theme';

const BENEFITS = [
  { t: 'Todas as babás disponíveis', d: 'Filtre por data, região e selo dourado.' },
  { t: 'Taxa de serviço de 5%', d: 'Metade da taxa padrão em cada contratação.' },
  { t: 'Conteúdos da Ana', d: 'Dicas para receber, orientar e manter uma boa babá.' }
];

export default function Premium() {
  const { isPremium, premiumUntil } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fechar" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}>
            <Body size={18}>✕</Body>
          </Pressable>
        </View>
        {isPremium ? (
          <View style={{ alignItems: 'center', gap: 14, paddingTop: 40 }}>
            <GoldSurface width={72} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}><Crown size={30} /></GoldSurface>
            <Title size={32} style={{ textAlign: 'center' }}>Você é Premium</Title>
            <Body muted style={{ textAlign: 'center' }}>Válido até {new Date(premiumUntil!).toLocaleDateString('pt-BR')}.</Body>
            <Button label="Ver as babás" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <Title size={34}>Todas as babás da sua região, a um toque</Title>
            <Body muted>Hoje você vê só os perfis de exemplo.</Body>
            {BENEFITS.map((b) => (
              <View key={b.t} style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Check size={16} color={colors.plum} /></View>
                <View style={{ flex: 1, gap: 2 }}><Strong size={16}>{b.t}</Strong><Body muted size={14}>{b.d}</Body></View>
              </View>
            ))}
            <View style={{ borderWidth: 2, borderColor: colors.plum, borderRadius: 22, padding: 16, backgroundColor: colors.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View><Strong size={16}>Anual</Strong><Body muted size={13}>cerca de R$ 24,75 por mês</Body></View>
              <Strong size={22}>R$ 297/ano</Strong>
            </View>
            <Button label="Assinatura disponível no lançamento" disabled />
            <Body muted size={12} style={{ textAlign: 'center' }}>Fase de testes: peça à equipe um premium de teste. No lançamento, a cobrança anual será pela loja do seu celular, com cancelamento a qualquer momento.</Body>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
