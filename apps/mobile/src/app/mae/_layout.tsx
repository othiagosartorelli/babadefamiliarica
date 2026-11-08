import { Redirect, Tabs } from 'expo-router';
import { homeFor, useAuth } from '@/lib/auth';
import { TabIcon } from '@/components/TabIcon';
import { colors, fonts } from '@/theme';

export default function MaeTabs() {
  const { session, profile, profileReady } = useAuth();
  if (!session) return <Redirect href="/" />;
  if (!profileReady) return null;
  if (!profile) return <Redirect href="/cadastro" />;
  if (profile.role !== 'mae' && profile.role !== 'admin') return <Redirect href={homeFor(profile.role)} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.plum,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.ivory }
      }}
    >
      <Tabs.Screen name="buscar" options={{ title: 'Buscar', tabBarIcon: ({ color }) => <TabIcon name="buscar" color={String(color)} /> }} />
      <Tabs.Screen name="favoritas" options={{ title: 'Favoritas', tabBarIcon: ({ color }) => <TabIcon name="favoritas" color={String(color)} /> }} />
      <Tabs.Screen name="mensagens" options={{ title: 'Mensagens', tabBarIcon: ({ color }) => <TabIcon name="mensagens" color={String(color)} /> }} />
      <Tabs.Screen name="ana" options={{ title: 'Ana', tabBarIcon: ({ color }) => <TabIcon name="ana" color={String(color)} /> }} />
      <Tabs.Screen name="conta" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon name="conta" color={String(color)} /> }} />
    </Tabs>
  );
}
