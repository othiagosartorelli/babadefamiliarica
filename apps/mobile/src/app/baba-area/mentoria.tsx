// Mentoria Babá de Família Rica: compra no checkout da Greenn (navegador) e volta ao app liberada.
// O webhook da Greenn liga o selo no servidor; o app só precisa atualizar ao voltar.
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldSeal } from '@/components/Gold';
import { Lock } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const CHECKOUT = process.env.EXPO_PUBLIC_GREENN_CHECKOUT_URL;

export default function Mentoria() {
  const comprar = () => {
    if (!CHECKOUT) return;
    // E-mail e CPF pré-preenchidos quando a Greenn aceitar parâmetros na URL (a confirmar).
    Linking.openURL(CHECKOUT);
  };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={{ backgroundColor: colors.plum, borderRadius: 26, padding: 20, gap: 12 }}>
          <Body size={13} style={{ color: '#E9D3A6', letterSpacing: 1.5 }}>MENTORIA</Body>
          <Title size={28} style={{ color: colors.white }}>Babá de Família Rica com Ana Maldonado</Title>
          <Body size={15} style={{ color: '#F3E6EC' }}>Postura, apresentação e comunicação para trabalhar com famílias de alto padrão. Ao concluir, você ganha o selo dourado e o anel na foto.</Body>
          <GoldSeal size="md" />
        </View>
        <Strong size={17}>Aulas</Strong>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }, shadow]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' }}><Lock color={colors.muted} /></View>
            <View><Strong>Aula {i}</Strong><Body muted size={13}>Tema a definir pela Ana</Body></View>
          </View>
        ))}
        <Button label="Quero o selo dourado · R$ 1.497" onPress={comprar} disabled={!CHECKOUT} />
        <Body muted size={12} style={{ textAlign: 'center' }}>
          No Pix ou em até 12x no cartão (com juros da plataforma). Pagamento seguro pela Greenn; você volta para o app com tudo liberado.
        </Body>
      </ScrollView>
    </SafeAreaView>
  );
}
