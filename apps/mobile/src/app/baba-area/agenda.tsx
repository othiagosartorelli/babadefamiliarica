// Agenda da babá com registro de entrada e saída (a localização entra quando o expo-location for ligado).
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

export default function Agenda() {
  const [stage, setStage] = useState<'antes' | 'em-andamento' | 'concluido'>('antes');
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Title size={30}>Agenda</Title>
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 10 }, shadow]}>
          <Strong size={16}>Carolina · Jardins</Strong>
          <Body muted size={14}>Sáb, 15 nov · 19h às 23h · 2 crianças</Body>
          <Body size={13}>O endereço completo aparece 12h antes do atendimento.</Body>
          {stage === 'antes' && <Button label="Registrar entrada" onPress={() => setStage('em-andamento')} />}
          {stage === 'em-andamento' && <Button label="Registrar saída" onPress={() => setStage('concluido')} />}
          {stage === 'concluido' && (
            <View style={{ backgroundColor: colors.greenBg, borderRadius: 16, padding: 12 }}>
              <Body size={14} style={{ color: colors.green }}>Atendimento concluído. O repasse sai em até 2 dias úteis.</Body>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
