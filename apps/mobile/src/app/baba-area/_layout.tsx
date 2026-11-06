import { Tabs } from 'expo-router';
import { TabIcon } from '@/components/TabIcon';
import { colors, fonts } from '@/theme';

export default function BabaTabs() {
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
      <Tabs.Screen name="propostas" options={{ title: 'Propostas', tabBarIcon: ({ color }) => <TabIcon name="propostas" color={String(color)} /> }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: ({ color }) => <TabIcon name="agenda" color={String(color)} /> }} />
      <Tabs.Screen name="mentoria" options={{ title: 'Ana', tabBarIcon: ({ color }) => <TabIcon name="ana" color={String(color)} /> }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon name="perfil" color={String(color)} /> }} />
    </Tabs>
  );
}
