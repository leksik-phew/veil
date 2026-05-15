import { Tabs } from 'expo-router';
import { useVeilStore } from '../../src/store/useStore';
import { SettingsIcon } from '../../src/components/SettingsIcon';
import { Text } from 'react-native';

const icon = (ch: string) =>
  ({ focused, color }: { focused: boolean; color: string }) => (
    <Text style={{ fontSize: 20, color }}>{ch}</Text>
  );

export default function TabLayout() {
  const theme = useVeilStore(s => s.theme);

  return (
    <Tabs
      screenOptions={{
        headerShown:   false,
        sceneStyle:    { backgroundColor: theme.bg },
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor:  theme.border,
          borderTopWidth:  0.5,
          height:          80,
          paddingBottom:   18,
        },
        tabBarActiveTintColor:   theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'check-in', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="journal"  options={{ title: 'journal',  tabBarIcon: icon('◈') }} />
      <Tabs.Screen name="insights" options={{ title: 'patterns', tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="voice"    options={{ title: 'voice',    tabBarIcon: icon('◐') }} />
      <Tabs.Screen name="breathe"  options={{ title: 'breathe',  tabBarIcon: icon('◌') }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'settings',
          tabBarIcon: ({ focused, color }) => (
            <SettingsIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
