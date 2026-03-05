import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // جلب الملف الشخصي
    const unsub = firestore().collection('users').doc(userId).onSnapshot(doc => {
      if (doc.exists) setProfile({ ...doc.data() as UserProfile, uid: doc.id });
      setLoading(false);
    });
    // تسجيل زيارة الملف الشخصي
    if (user && user.uid !== userId) {
      firestore().collection('profileVisits').add({
        visitorUid: user.uid,
        visitedUid: userId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!user || !userId || user.uid === userId) return;
    // فحص الصداقة
    const checkFriendship = async () => {
      try {
        const q1 = await firestore().collection('friendRequests')
          .where('fromUid', '==', user.uid).where('toUid', '==', userId).where('status', '==', 'accepted').get();
        const q2 = await firestore().collection('friendRequests')
          .where('fromUid', '==', userId).where('toUid', '==', user.uid).where('status', '==', 'accepted').get();
        setIsFriend(!q1.empty || !q2.empty);
        const pending = await firestore().collection('friendRequests')
          .where('fromUid', '==', user.uid).where('toUid', '==', userId).where('status', '==', 'pending').get();
        setFriendRequestSent(!pending.empty);
        // فحص الحظر
        const block = await firestore().collection('blocks')
          .where('blockerId', '==', user.uid).where('blockedId', '==', userId).get();
        setIsBlocked(!block.empty);
      } catch {}
    };
    checkFriendship();
  }, [user, userId]);

  const openChat = async () => {
    if (!user || !profile) return;
    setActionLoading(true);
    try {
      const q = await firestore().collection('conversations')
        .where('participants', 'array-contains', user.uid).get();
      let existingId: string | null = null;
      q.forEach(doc => {
        if (doc.data().participants?.includes(userId)) existingId = doc.id;
      });
      if (!existingId) {
        const newConv = await firestore().collection('conversations').add({
          participants: [user.uid, userId],
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastMessageAt: firestore.FieldValue.serverTimestamp(),
          unreadCounts: {},
        });
        existingId = newConv.id;
      }
      navigation.navigate('Chat', {
        conversationId: existingId,
        otherUserId: userId,
        userName: getDisplayName(profile),
        userPhoto: getAvatar(profile) || '',
      });
    } catch (err) {
      Alert.alert('خطأ', 'فشل فتح المحادثة');
    } finally {
      setActionLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !profile) return;
    setActionLoading(true);
    try {
      await firestore().collection('friendRequests').add({
        fromUid: user.uid,
        toUid: userId,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      // إشعار
      await firestore().collection('notifications').add({
        recipientUid: userId,
        senderUid: user.uid,
        type: 'friend_request',
        title: 'طلب صداقة جديد',
        body: 'أرسل إليك طلب صداقة',
        isRead: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      setFriendRequestSent(true);
    } catch {
      Alert.alert('خطأ', 'فشل إرسال طلب الصداقة');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBlock = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (isBlocked) {
        const q = await firestore().collection('blocks')
          .where('blockerId', '==', user.uid).where('blockedId', '==', userId).get();
        const batch = firestore().batch();
        q.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        setIsBlocked(false);
      } else {
        await firestore().collection('blocks').add({
          blockerId: user.uid,
          blockedId: userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        setIsBlocked(true);
      }
    } catch {
      Alert.alert('خطأ', 'فشل تنفيذ العملية');
    } finally {
      setActionLoading(false);
    }
  };

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

  const name = getDisplayName(profile);
  const avatar = getAvatar(profile);
  const isOwnProfile = user?.uid === userId;

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
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: profile.isOnline ? COLORS.online : COLORS.offline }]} />
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {profile.isOwner && <Text>👑</Text>}
          {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={COLORS.info} />}
        </View>
        <Text style={[styles.status, { color: profile.isOnline ? COLORS.online : COLORS.textMuted }]}>
          {profile.isOnline ? 'متصل الآن' : 'غير متصل'}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.location}>
            {[profile.city, profile.country].filter(Boolean).join(', ')}
          </Text>
          {profile.age ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.location}>{profile.age} سنة</Text>
            </>
          ) : null}
        </View>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      {/* Action Buttons */}
      {!isOwnProfile && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={openChat}
            disabled={actionLoading || isBlocked}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.chatBtnText}>إرسال رسالة</Text>
              </>
            )}
          </TouchableOpacity>
          {!isFriend && !friendRequestSent && (
            <TouchableOpacity
              style={styles.friendBtn}
              onPress={sendFriendRequest}
              disabled={actionLoading}
            >
              <Ionicons name="person-add" size={20} color={COLORS.primary} />
              <Text style={styles.friendBtnText}>إضافة صديق</Text>
            </TouchableOpacity>
          )}
          {friendRequestSent && (
            <View style={styles.pendingBtn}>
              <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.pendingBtnText}>طلب مرسل</Text>
            </View>
          )}
          {isFriend && (
            <View style={styles.friendedBtn}>
              <Ionicons name="people" size={20} color={COLORS.success} />
              <Text style={styles.friendedBtnText}>أصدقاء</Text>
            </View>
          )}
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        {profile.gender ? (
          <InfoRow icon="person-outline" label="الجنس" value={profile.gender === 'male' ? 'ذكر' : 'أنثى'} />
        ) : null}
        {profile.livingIn ? (
          <InfoRow icon="home-outline" label="يعيش في" value={profile.livingIn} />
        ) : null}
        {profile.instagram ? (
          <InfoRow icon="logo-instagram" label="Instagram" value={`@${profile.instagram}`} />
        ) : null}
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

      {/* Block Button */}
      {!isOwnProfile && (
        <TouchableOpacity
          style={styles.blockBtn}
          onPress={() => Alert.alert(
            isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم',
            isBlocked ? 'هل تريد إلغاء حظر هذا المستخدم؟' : 'هل تريد حظر هذا المستخدم؟',
            [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تأكيد', style: 'destructive', onPress: toggleBlock },
            ]
          )}
        >
          <Ionicons name={isBlocked ? 'ban-outline' : 'ban-outline'} size={18} color={isBlocked ? COLORS.success : COLORS.error} />
          <Text style={[styles.blockBtnText, { color: isBlocked ? COLORS.success : COLORS.error }]}>
            {isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
          </Text>
        </TouchableOpacity>
      )}
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
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm,
    gap: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
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
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  profileSection: { alignItems: 'center', padding: SIZES.xl, backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm },
  avatarContainer: { position: 'relative', marginBottom: SIZES.md },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.bgCard,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary },
  status: { fontSize: SIZES.fontSm, marginBottom: SIZES.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SIZES.xs },
  location: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  dot: { color: COLORS.textMuted },
  bio: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.xs },
  actions: {
    flexDirection: 'row', gap: SIZES.sm,
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md,
    backgroundColor: COLORS.bgCard, marginBottom: SIZES.sm,
  },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
  },
  chatBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
  friendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  friendBtnText: { color: COLORS.primary, fontSize: SIZES.fontMd, fontWeight: '600' },
  pendingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pendingBtnText: { color: COLORS.textMuted, fontSize: SIZES.fontMd },
  friendedBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
    borderWidth: 1, borderColor: COLORS.success,
  },
  friendedBtnText: { color: COLORS.success, fontSize: SIZES.fontMd, fontWeight: '600' },
  infoCard: {
    backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm,
  },
  interestsCard: {
    backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm,
  },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary + '20',
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  chipText: { color: COLORS.primary, fontSize: SIZES.fontSm },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginHorizontal: SIZES.lg, marginVertical: SIZES.md,
    paddingVertical: SIZES.md, borderRadius: SIZES.radiusMd,
    borderWidth: 1, borderColor: COLORS.error + '50',
  },
  blockBtnText: { fontSize: SIZES.fontSm, fontWeight: '600' },
});
