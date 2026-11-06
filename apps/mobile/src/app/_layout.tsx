import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/lib/store';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({ CormorantGaramond_600SemiBold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ivory }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="mae" />
          <Stack.Screen name="baba-area" />
          <Stack.Screen name="baba/[id]" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="proposta/[id]" />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
