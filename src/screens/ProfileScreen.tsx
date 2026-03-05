import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

export default function ProfileScreen({ navigation }: any) {
  const { user, userProfile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!userProfile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ملفي الشخصي</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Image source={{ uri: userProfile.photoURL || '' }} style={styles.avatar} />
        <Text style={styles.name}>{userProfile.displayName}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.location}>{userProfile.city}, {userProfile.country}</Text>
        </View>
        {userProfile.bio ? <Text style={styles.bio}>{userProfile.bio}</Text> : null}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <InfoRow icon="calendar-outline" label="العمر" value={`${userProfile.age} سنة`} />
        <InfoRow icon="person-outline" label="الجنس" value={userProfile.gender === 'male' ? 'ذكر' : 'أنثى'} />
        {userProfile.livingIn ? <InfoRow icon="home-outline" label="يعيش في" value={userProfile.livingIn} /> : null}
        {userProfile.instagram ? <InfoRow icon="logo-instagram" label="Instagram" value={`@${userProfile.instagram}`} /> : null}
      </View>

      {/* Interests */}
      {userProfile.interests && userProfile.interests.length > 0 && (
        <View style={styles.interestsCard}>
          <Text style={styles.sectionTitle}>الاهتمامات</Text>
          <View style={styles.interestsGrid}>
            {userProfile.interests.map(interest => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Edit Button */}
      <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
        <Ionicons name="pencil" size={18} color="#fff" />
        <Text style={styles.editBtnText}>تعديل الملف الشخصي</Text>
      </TouchableOpacity>
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
  scroll: { paddingBottom: 80 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },

  profileCard: { alignItems: 'center', padding: SIZES.xl, backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary, marginBottom: SIZES.md },
  name: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SIZES.xs },
  location: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  bio: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.xs },

  infoCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  interestsCard: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary + '30', borderWidth: 1, borderColor: COLORS.primary + '60' },
  chipText: { color: COLORS.primary, fontSize: SIZES.fontSm },

  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md },
  editBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
});
