import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EntryCard from '../../src/components/EntryCard';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import { TRANSLATIONS } from '../../src/i18n/translations';

export default function JournalScreen() {
  const { checkIns, t, lang } = useVeilStore(s => ({ checkIns: s.checkIns, t: s.theme, lang: s.lang }));
  const tr = TRANSLATIONS[lang].journal;
  return (
    <FadeScreen>
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.header}>
          <Text style={[s.title, { color: t.text }]}>{tr.title}</Text>
          <View style={[s.badge, { backgroundColor: t.chip }]}>
            <Text style={[s.badgeText, { color: t.textMuted }]}>{checkIns.length}</Text>
          </View>
        </View>

        <FlatList
          style={s.list}
          data={checkIns}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <EntryCard entry={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={[s.emptyIcon, { color: t.textDim }]}>{tr.emptyIcon}</Text>
              <Text style={[s.emptyText, { color: t.textMuted }]}>{tr.emptyTitle}</Text>
              <Text style={[s.emptySub, { color: t.textDim }]}>{tr.emptySub}</Text>
            </View>
          }
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </FadeScreen>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  title:       { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  badge:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontSize: 14, fontWeight: '500' },
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 24 },
  empty:       { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyIcon:   { fontSize: 44 },
  emptyText:   { fontSize: 17 },
  emptySub:    { fontSize: 14 },
});
