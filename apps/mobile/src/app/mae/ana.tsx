// Conteúdos da Ana para as mães. Os vídeos virão da tabela "contents" (publicados pelo painel).
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

const CATS = ['Todos', 'Primeira babá', 'Rotina', 'Viagens'];

export default function Ana() {
  const [cat, setCat] = useState('Todos');
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Title size={30}>Da Ana para você</Title>
          <Body muted size={13}>Dicas de quem viveu a rotina das famílias</Body>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATS.map((c) => <Chip key={c} label={c} active={c === cat} onPress={() => setCat(c)} />)}
        </ScrollView>
        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 6 }, shadow]}>
          <Strong>Os vídeos da Ana chegam em breve</Strong>
          <Body muted size={14}>Assim que forem publicados no painel, aparecem aqui por categoria.</Body>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
