// Meu perfil (babá): checklist de cadastro que mostra a porcentagem completa.
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from '@/components/icons';
import { Body, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const STEPS = [
  { id: 'dados', title: 'Foto e dados pessoais', hint: 'Foto profissional, idade e bairros que atende' },
  { id: 'exp', title: 'Experiência e formação', hint: 'Faixas etárias, cursos e idiomas' },
  { id: 'verif', title: 'Verificação completa', hint: 'Documento, selfie, antecedentes e endereço' },
  { id: 'video', title: 'Vídeo de apresentação', hint: 'De 30 a 60 segundos. Perfis com vídeo recebem mais propostas' },
  { id: 'precos', title: 'Valores e modalidades', hint: 'Hora, diária, pernoite e viagens' }
];

export default function Perfil() {
  const [done, setDone] = useState<Record<string, boolean>>({ dados: true, exp: true, verif: true });
  const pct = Math.round((STEPS.filter((s) => done[s.id]).length / STEPS.length) * 100);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Body muted size={14}>Olá, Fernanda</Body>
          <Title size={32}>Seu perfil está {pct}% pronto</Title>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} style={{ height: 10, borderRadius: 5, backgroundColor: colors.line }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.plum, width: `${pct}%` }} />
        </View>
        {STEPS.map((s) => {
          const on = !!done[s.id];
          return (
            <Pressable key={s.id} onPress={() => setDone((d) => ({ ...d, [s.id]: !on }))} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }, shadow]}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.plum : colors.white, borderWidth: on ? 0 : 2, borderColor: '#D9C9C1' }}>
                {on && <Check size={15} color={colors.white} strokeWidth={2.8} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}><Strong>{s.title}</Strong><Body muted size={13}>{s.hint}</Body></View>
              <Strong size={12} style={{ color: on ? colors.green : colors.plum }}>{on ? 'Feito' : 'Fazer'}</Strong>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/baba-area/mentoria')} accessibilityRole="button" style={{ backgroundColor: colors.plum, borderRadius: 24, padding: 18, gap: 4 }}>
          <Strong size={16} style={{ color: '#E9D3A6' }}>Conquiste o selo dourado</Strong>
          <Body size={13} style={{ color: '#F3E6EC' }}>Faça a Mentoria Babá de Família Rica e ganhe o anel dourado na sua foto.</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
