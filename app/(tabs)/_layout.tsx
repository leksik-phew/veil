import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../src/constants/emotions';

const icon = (ch: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, color: focused ? COLORS.accent : 'rgba(255,255,255,0.28)' }}>
      {ch}
    </Text>
  );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle:      { backgroundColor: '#0d0b14' },
        tabBarStyle: {
          backgroundColor: '#0d0b14',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 18,
        },
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.28)',
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'check-in', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="journal"  options={{ title: 'journal',  tabBarIcon: icon('◈') }} />
      <Tabs.Screen name="insights" options={{ title: 'patterns', tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="voice"    options={{ title: 'voice',    tabBarIcon: icon('◐') }} />
      <Tabs.Screen name="breathe"  options={{ title: 'breathe',  tabBarIcon: icon('◌') }} />
    </Tabs>
  );
}
