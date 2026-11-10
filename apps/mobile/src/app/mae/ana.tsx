// Conteúdos da Ana para as mães (publicados pelo painel).
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ContentList, useContents } from '@/components/ContentList';
import { Body, Title } from '@/components/ui';
import { colors } from '@/theme';

export default function Ana() {
  const items = useContents('maes');
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Title size={30}>Da Ana para você</Title>
          <Body muted size={13}>Dicas de quem viveu a rotina das famílias</Body>
        </View>
        <ContentList items={items} empty="Os vídeos da Ana chegam em breve. Assim que forem publicados, aparecem aqui." />
      </ScrollView>
    </SafeAreaView>
  );
}
