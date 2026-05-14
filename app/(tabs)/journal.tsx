import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EntryCard from '../../src/components/EntryCard';
import { useVeilStore } from '../../src/store/useStore';
import { COLORS } from '../../src/constants/emotions';

export default function JournalScreen() {
  const checkIns = useVeilStore(s => s.checkIns);
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={checkIns}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <EntryCard entry={item} />}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>journal</Text>
            <Text style={s.sub}>{checkIns.length} entries</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>◎</Text>
            <Text style={s.emptyText}>no entries yet</Text>
            <Text style={s.emptySub}>do your first check-in</Text>
          </View>
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  header:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title:     { fontSize: 22, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:       { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
  list:      { paddingHorizontal: 4, paddingBottom: 32 },
  empty:     { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40, color: COLORS.textDim },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  emptySub:  { fontSize: 13, color: COLORS.textDim },
});
