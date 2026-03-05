import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الإشعارات</Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="notifications-outline" size={60} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>لا توجد إشعارات جديدة</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
});
