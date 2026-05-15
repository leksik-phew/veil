import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EntryCard from '../../src/components/EntryCard';
import { FadeScreen } from '../../src/components/FadeScreen';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS } from '../../src/constants/emotions';

export default function JournalScreen() {
  const checkIns = useVeilStore(s => s.checkIns);
  return (
    <FadeScreen>
      <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>journal</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{checkIns.length}</Text>
        </View>
      </View>

      <FlatList
        style={s.list}
        data={checkIns}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <EntryCard entry={item} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>◎</Text>
            <Text style={s.emptyText}>no entries yet</Text>
            <Text style={s.emptySub}>do your first check-in</Text>
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
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  title:       { fontSize: 26, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
  badge:       { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 24 },
  empty:       { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyIcon:   { fontSize: 44, color: COLORS.textDim },
  emptyText:   { fontSize: 17, color: COLORS.textMuted },
  emptySub:    { fontSize: 14, color: COLORS.textDim },
});
