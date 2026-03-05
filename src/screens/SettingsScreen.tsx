import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  };

  const SettingItem = ({ icon, label, onPress, danger }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? COLORS.error : COLORS.textSecondary} />
      <Text style={[styles.itemText, danger && { color: COLORS.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الحساب</Text>
        <SettingItem
          icon="pencil-outline"
          label="تعديل الملف الشخصي"
          onPress={() => navigation.navigate('EditProfile')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الدعم</Text>
        <SettingItem
          icon="globe-outline"
          label="زيارة الموقع"
          onPress={() => Linking.openURL('https://kurdichat.vip')}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          label="سياسة الخصوصية"
          onPress={() => Linking.openURL('https://kurdichat.vip/privacy')}
        />
        <SettingItem
          icon="document-text-outline"
          label="شروط الاستخدام"
          onPress={() => Linking.openURL('https://kurdichat.vip/terms')}
        />
      </View>

      <View style={styles.section}>
        <SettingItem
          icon="log-out-outline"
          label="تسجيل الخروج"
          onPress={handleSignOut}
          danger
        />
      </View>

      <Text style={styles.version}>Kurdistan Chat v2.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  section: {
    backgroundColor: COLORS.bgCard, marginTop: SIZES.md,
    marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: SIZES.fontSm, color: COLORS.textMuted, fontWeight: '600',
    paddingHorizontal: SIZES.md, paddingTop: SIZES.md, paddingBottom: SIZES.xs,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.md,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemText: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.textPrimary },
  version: {
    textAlign: 'center', color: COLORS.textMuted, fontSize: SIZES.fontSm,
    marginTop: SIZES.xl, marginBottom: SIZES.lg,
  },
});
