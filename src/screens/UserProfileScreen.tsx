import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { COLLECTIONS } from '../lib/firebase';

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    firestore().collection(COLLECTIONS.USERS).doc(userId).get().then(doc => {
      if (doc.exists) setProfile(doc.data() as UserProfile);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  if (!profile) return (
    <View style={styles.loading}>
      <Text style={{ color: COLORS.textMuted }}>المستخدم غير موجود</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profile.photoURL || '' }} style={styles.avatar} />
          <View style={[styles.onlineDot, { backgroundColor: profile.isOnline ? COLORS.online : COLORS.offline }]} />
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.status}>{profile.isOnline ? 'متصل الآن' : 'غير متصل'}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.location}>{profile.city}, {profile.country}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.location}>{profile.age} سنة</Text>
        </View>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate('Chat', {
            userId: profile.uid,
            userName: profile.displayName,
            userPhoto: profile.photoURL || '',
          })}
        >
          <Ionicons name="chatbubble" size={20} color="#fff" />
          <Text style={styles.chatBtnText}>إرسال رسالة</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <InfoRow icon="person-outline" label="الجنس" value={profile.gender === 'male' ? 'ذكر' : 'أنثى'} />
        {profile.livingIn ? <InfoRow icon="home-outline" label="يعيش في" value={profile.livingIn} /> : null}
        {profile.instagram ? <InfoRow icon="logo-instagram" label="Instagram" value={`@${profile.instagram}`} /> : null}
      </View>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={styles.interestsCard}>
          <Text style={styles.sectionTitle}>الاهتمامات</Text>
          <View style={styles.interestsGrid}>
            {profile.interests.map(interest => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm, gap: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { flex: 1, color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  value: { color: COLORS.textPrimary, fontSize: SIZES.fontSm, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary },

  profileSection: { alignItems: 'center', padding: SIZES.xl, backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm },
  avatarContainer: { position: 'relative', marginBottom: SIZES.md },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.bgCard,
  },
  name: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  status: { fontSize: SIZES.fontSm, color: COLORS.online, marginBottom: SIZES.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SIZES.xs },
  location: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  dot: { color: COLORS.textMuted },
  bio: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.xs },

  actions: { paddingHorizontal: SIZES.md, marginBottom: SIZES.sm },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm, backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
  },
  chatBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },

  infoCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  interestsCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary + '30', borderWidth: 1, borderColor: COLORS.primary + '60' },
  chipText: { color: COLORS.primary, fontSize: SIZES.fontSm },
});
