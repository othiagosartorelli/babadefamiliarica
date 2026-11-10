// Player dos vídeos da Ana (link temporário do armazenamento privado).
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { signedUrl } from '@/lib/supabase';
import { Back } from '@/components/icons';
import { Body, Title } from '@/components/ui';

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.play(); });
  return <VideoView player={player} style={{ width: '100%', aspectRatio: 9 / 16, maxHeight: 640, backgroundColor: '#000' }} nativeControls allowsPictureInPicture contentFit="contain" />;
}

export default function Video() {
  const { path, title } = useLocalSearchParams<{ path: string; title?: string }>();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { signedUrl(path, 'conteudos').then((u) => (u ? setUri(u) : setFailed(true))); }, [path]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#140D10' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back color="#FFFFFF" /></Pressable>
        <Title size={20} style={{ color: '#FFFFFF', flex: 1 }}>{title ?? ''}</Title>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {uri && <Player uri={uri} />}
        {failed && <Body style={{ color: '#FFFFFF', textAlign: 'center' }}>Não foi possível abrir este vídeo agora.</Body>}
      </View>
    </SafeAreaView>
  );
}
