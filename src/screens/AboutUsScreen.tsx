import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

export default function AboutUsScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>من نحن</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.heroSection}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>Kurdistan Chat</Text>
        <Text style={styles.version}>الإصدار 2.1</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌟 عن التطبيق</Text>
        <Text style={styles.cardText}>
          Kurdistan Chat هو تطبيق اجتماعي مخصص للشعب الكردي حول العالم. يهدف إلى توحيد الكرد في منصة واحدة للتواصل والتعارف ومشاركة الثقافة الكردية.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✨ مميزات التطبيق</Text>
        {[
          '💬 دردشة عامة وخاصة',
          '📸 مشاركة القصص اليومية',
          '👥 البحث عن أصدقاء جدد',
          '📍 اكتشاف الأشخاص القريبين منك',
          '🏆 نظام النقاط والمتصدرين',
          '🔔 إشعارات فورية',
          '🎤 رسائل صوتية',
          '🗺️ مشاركة الموقع',
        ].map((feature, i) => (
          <Text key={i} style={styles.featureItem}>{feature}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 تواصل معنا</Text>
        <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL('https://instagram.com/redoan.m7')}>
          <Ionicons name="logo-instagram" size={22} color="#E1306C" />
          <Text style={styles.socialText}>@redoan.m7</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL('https://kurdichat.vip')}>
          <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
          <Text style={styles.socialText}>kurdichat.vip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        صُنع بـ ❤️ للشعب الكردي{'\n'}
        جميع الحقوق محفوظة © 2024 Kurdistan Chat
      </Text>
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
  heroSection: { alignItems: 'center', padding: SIZES.xl, backgroundColor: COLORS.bgCard, marginBottom: SIZES.md },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: SIZES.md },
  appName: { fontSize: SIZES.fontTitle, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  version: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md },
  cardTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  cardText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 22 },
  featureItem: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, paddingVertical: 4, lineHeight: 22 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: SIZES.sm },
  socialText: { fontSize: SIZES.fontMd, color: COLORS.primary },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: SIZES.fontSm, margin: SIZES.xl, lineHeight: 22 },
});
