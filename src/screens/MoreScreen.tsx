import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';

type TabType = 'search' | 'active' | 'friends' | 'leaderboard';

export default function MoreScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeMembers, setActiveMembers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'active') loadActiveMembers();
    else if (activeTab === 'friends') loadFriends();
    else if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab]);

  const loadActiveMembers = async () => {
    setLoading(true);
    try {
      const snap = await firestore()
        .collection('users')
        .where('isOnline', '==', true)
        .limit(100)
        .get();
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.uid !== user?.uid);
      setActiveMembers(list);
    } catch {}
    setLoading(false);
  };

  const loadFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [snap1, snap2] = await Promise.all([
        firestore().collection('friendRequests').where('fromUid', '==', user.uid).where('status', '==', 'accepted').get(),
        firestore().collection('friendRequests').where('toUid', '==', user.uid).where('status', '==', 'accepted').get(),
      ]);
      const friendUids = [
        ...snap1.docs.map(d => d.data().toUid),
        ...snap2.docs.map(d => d.data().fromUid),
      ];
      if (friendUids.length === 0) { setFriends([]); setLoading(false); return; }
      const chunks = [];
      for (let i = 0; i < friendUids.length; i += 10) chunks.push(friendUids.slice(i, i + 10));
      const allFriends: UserProfile[] = [];
      for (const chunk of chunks) {
        const snap = await firestore().collection('users').where(firestore.FieldPath.documentId(), 'in', chunk).get();
        snap.docs.forEach(d => allFriends.push({ uid: d.id, ...d.data() } as UserProfile));
      }
      setFriends(allFriends);
    } catch {}
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const snap = await firestore().collection('userPoints').orderBy('points', 'desc').limit(100).get();
      const list = await Promise.all(snap.docs.map(async (d, idx) => {
        const pointsData = d.data();
        const userDoc = await firestore().collection('users').doc(d.id).get();
        const userData = userDoc.data() as UserProfile;
        return { uid: d.id, rank: idx + 1, points: pointsData.points || 0, ...userData };
      }));
      setLeaderboard(list);
    } catch {}
    setLoading(false);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const [byUsername, byName] = await Promise.all([
        firestore().collection('users').where('username', '>=', q.toLowerCase()).where('username', '<=', q.toLowerCase() + '\uf8ff').limit(20).get(),
        firestore().collection('users').where('displayName', '>=', q).where('displayName', '<=', q + '\uf8ff').limit(20).get(),
      ]);
      const seen = new Set<string>();
      const results: UserProfile[] = [];
      [...byUsername.docs, ...byName.docs].forEach(d => {
        if (!seen.has(d.id) && d.id !== user?.uid) {
          seen.add(d.id);
          results.push({ uid: d.id, ...d.data() } as UserProfile);
        }
      });
      setSearchResults(results);
    } catch {}
    setSearching(false);
  }, [user]);

  const formatLastSeen = (lastSeen: any): string => {
    if (!lastSeen) return 'غير متصل';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'قبل دقيقة';
    if (diff < 300000) return 'قبل 5 دقائق';
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `قبل ${Math.floor(diff / 3600000)} ساعة`;
    if (diff < 2592000000) return `قبل ${Math.floor(diff / 86400000)} يوم`;
    return 'منذ فترة';
  };

  const UserCard = ({ item, rank }: { item: UserProfile & { points?: number; rank?: number }; rank?: number }) => {
    const name = getDisplayName(item);
    const avatar = getAvatar(item);
    const location = [item.city, item.country].filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
        activeOpacity={0.8}
      >
        {rank && (
          <View style={[styles.rankBadge, rank <= 3 && styles.rankBadgeTop]}>
            <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
            </Text>
          </View>
        )}
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{name}</Text>
            {item.isOnline && <View style={styles.onlineDot} />}
            {item.isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.info} />}
          </View>
          {location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          {item.points !== undefined ? (
            <Text style={styles.pointsText}>⭐ {item.points} نقطة</Text>
          ) : (
            <Text style={styles.lastSeen}>
              {item.isOnline ? '🟢 متصل الآن' : formatLastSeen(item.lastSeen)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => navigation.navigate('Chat', {
            conversationId: [user?.uid, item.uid].sort().join('_'),
            otherUserId: item.uid,
            userName: name,
            userPhoto: avatar || '',
          })}
        >
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'search', label: 'البحث', icon: 'search-outline' },
    { key: 'active', label: 'النشطون', icon: 'radio-button-on-outline' },
    { key: 'friends', label: 'أصدقائي', icon: 'people-outline' },
    { key: 'leaderboard', label: 'المتصدرون', icon: 'trophy-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المزيد</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <View style={styles.flex}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="ابحث عن مستخدم..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={({ item }) => <UserCard item={item} />}
              keyExtractor={item => item.uid}
              contentContainerStyle={{ paddingBottom: 80 }}
            />
          ) : searchQuery.length >= 2 && !searching ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={50} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>لا توجد نتائج</Text>
            </View>
          ) : searchQuery.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={50} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>ابحث عن أصدقاء جدد</Text>
              <Text style={styles.emptySubText}>اكتب الاسم أو اسم المستخدم</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Active Members Tab */}
      {activeTab === 'active' && (
        <View style={styles.flex}>
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <FlatList
              data={activeMembers}
              renderItem={({ item }) => <UserCard item={item} />}
              keyExtractor={item => item.uid}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListHeaderComponent={
                <Text style={styles.listHeader}>{activeMembers.length} عضو متصل الآن 🟢</Text>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="radio-button-off-outline" size={50} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>لا يوجد أعضاء متصلون الآن</Text>
                </View>
              }
              onRefresh={loadActiveMembers}
              refreshing={loading}
            />
          )}
        </View>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <View style={styles.flex}>
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <FlatList
              data={friends}
              renderItem={({ item }) => <UserCard item={item} />}
              keyExtractor={item => item.uid}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListHeaderComponent={
                friends.length > 0 ? <Text style={styles.listHeader}>{friends.length} صديق</Text> : null
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={50} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>لا يوجد أصدقاء بعد</Text>
                  <Text style={styles.emptySubText}>ابحث عن أشخاص وأضفهم كأصدقاء</Text>
                </View>
              }
              onRefresh={loadFriends}
              refreshing={loading}
            />
          )}
        </View>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <View style={styles.flex}>
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <FlatList
              data={leaderboard}
              renderItem={({ item }) => <UserCard item={item} rank={item.rank} />}
              keyExtractor={item => item.uid}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListHeaderComponent={
                <Text style={styles.listHeader}>🏆 أفضل {leaderboard.length} عضو</Text>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="trophy-outline" size={50} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>لا توجد بيانات بعد</Text>
                </View>
              }
              onRefresh={loadLeaderboard}
              refreshing={loading}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SIZES.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.bgInput, margin: SIZES.md, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: SIZES.fontSm, paddingVertical: SIZES.sm },
  listHeader: { fontSize: SIZES.fontSm, color: COLORS.textMuted, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm },
  userCard: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SIZES.sm,
  },
  rankBadge: { width: 32, alignItems: 'center' },
  rankBadgeTop: {},
  rankText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, fontWeight: '600' },
  rankTextTop: { fontSize: SIZES.fontLg },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { backgroundColor: COLORS.primary + '40', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.primary },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.online },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  locationText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, flex: 1 },
  lastSeen: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  pointsText: { fontSize: SIZES.fontXs, color: COLORS.accent },
  msgBtn: { padding: 8, backgroundColor: COLORS.primary + '20', borderRadius: SIZES.radiusFull },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: SIZES.sm },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  emptySubText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
});
