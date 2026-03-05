import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { getDisplayName, getAvatar } from '../lib/firebase';

export default function ProfileScreen({ navigation }: any) {
  const { user, userProfile, signOut } = useAuth();
  const [stats, setStats] = useState({ friends: 0, points: 0, messages: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        const [friendsSnap, pointsDoc] = await Promise.all([
          firestore().collection('friendRequests')
            .where('status', '==', 'accepted')
            .where('fromUid', '==', user.uid)
            .get(),
          firestore().collection('userPoints').doc(user.uid).get(),
        ]);
        const points = pointsDoc.exists ? (pointsDoc.data()?.points || 0) : 0;
        setStats({ friends: friendsSnap.size, points, messages: 0 });
      } catch {}
      setLoadingStats(false);
    };
    loadStats();
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!userProfile) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const name = getDisplayName(userProfile);
  const avatar = getAvatar(userProfile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ملفي الشخصي</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: COLORS.online }]} />
          {userProfile.isOwner && (
            <View style={styles.ownerBadge}><Text style={styles.ownerText}>👑</Text></View>
          )}
          {userProfile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.info} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{name}</Text>
        {userProfile.username ? <Text style={styles.username}>@{userProfile.username}</Text> : null}
        {(userProfile.city || userProfile.country) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.location}>{[userProfile.city, userProfile.country].filter(Boolean).join(', ')}</Text>
          </View>
        )}
        {userProfile.bio ? <Text style={styles.bio}>{userProfile.bio}</Text> : null}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loadingStats ? '...' : stats.friends}</Text>
          <Text style={styles.statLabel}>أصدقاء</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loadingStats ? '...' : stats.points}</Text>
          <Text style={styles.statLabel}>نقاط</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile.age || '-'}</Text>
          <Text style={styles.statLabel}>العمر</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
        {userProfile.gender && (
          <InfoRow icon="person-outline" label="الجنس" value={userProfile.gender === 'male' ? '👨 ذكر' : userProfile.gender === 'female' ? '👩 أنثى' : 'أخرى'} />
        )}
        {userProfile.age && (
          <InfoRow icon="calendar-outline" label="العمر" value={`${userProfile.age} سنة`} />
        )}
        {userProfile.country && (
          <InfoRow icon="flag-outline" label="الدولة" value={userProfile.country} />
        )}
        {userProfile.city && (
          <InfoRow icon="business-outline" label="المنطقة / المدينة" value={userProfile.city} />
        )}
        {(userProfile as any).livingIn && (
          <InfoRow icon="home-outline" label="أين تعيش" value={(userProfile as any).livingIn} />
        )}
        {(userProfile as any).instagram && (
          <InfoRow icon="logo-instagram" label="Instagram" value={`@${(userProfile as any).instagram}`} />
        )}
        {userProfile.email && (
          <InfoRow icon="mail-outline" label="البريد الإلكتروني" value={userProfile.email} />
        )}
      </View>

      {/* Interests */}
      {userProfile.interests && userProfile.interests.length > 0 && (
        <View style={styles.interestsCard}>
          <Text style={styles.sectionTitle}>الاهتمامات</Text>
          <View style={styles.interestsGrid}>
            {userProfile.interests.map((interest, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="pencil-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>تعديل الملف الشخصي</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>الإعدادات</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AboutUs')}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>من نحن</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ContactUs')}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>تواصل معنا</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={[styles.actionText, { color: COLORS.error }]}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm, gap: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { flex: 1, color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  value: { color: COLORS.textPrimary, fontSize: SIZES.fontSm, fontWeight: '500', maxWidth: '55%' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 80 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  profileCard: { alignItems: 'center', padding: SIZES.xl, backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm },
  avatarContainer: { position: 'relative', marginBottom: SIZES.md },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.bgCard },
  ownerBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 2 },
  ownerText: { fontSize: 16 },
  verifiedBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.bgCard, borderRadius: 10 },
  name: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 2 },
  username: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginBottom: SIZES.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SIZES.xs },
  location: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  bio: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.xs, lineHeight: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm, paddingVertical: SIZES.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.textPrimary },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  infoCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm },
  interestsCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
  chipText: { color: COLORS.primary, fontSize: SIZES.fontSm },
  actionsCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, overflow: 'hidden', marginBottom: SIZES.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, paddingHorizontal: SIZES.md, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionText: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.textPrimary },
  logoutBtn: { borderBottomWidth: 0 },
});
