import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useVeilStore } from '../../src/store/useStore';
import { SettingsIcon } from '../../src/components/SettingsIcon';
import { TRANSLATIONS } from '../../src/i18n/translations';

const icon = (ch: string) =>
  ({ color }: { focused: boolean; color: string }) => (
    <Text style={{ fontSize: 20, color }}>{ch}</Text>
  );

export default function TabLayout() {
  const theme = useVeilStore(s => s.theme);
  const lang  = useVeilStore(s => s.lang);
  const tr    = TRANSLATIONS[lang].tabs;

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
      <Tabs.Screen name="index"    options={{ title: tr.checkin,  tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="journal"  options={{ title: tr.journal,  tabBarIcon: icon('◈') }} />
      <Tabs.Screen name="insights" options={{ title: tr.patterns, tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="voice"    options={{ title: tr.voice,    tabBarIcon: icon('◐') }} />
      <Tabs.Screen name="breathe"  options={{ title: tr.breathe,  tabBarIcon: icon('◌') }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr.settings,
          tabBarIcon: ({ focused, color }) => (
            <SettingsIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
