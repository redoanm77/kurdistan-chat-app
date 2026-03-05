import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';

type FilterType = 'all' | 'online' | 'male' | 'female';

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newUsers, setNewUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<'online' | 'new' | 'all'>('online');

  // جلب المستخدمين المتصلين - نفس الموقع
  const fetchOnlineUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('isOnline', '==', true)
      .where('profileComplete', '==', true)
      .limit(50)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !data.isDeactivated) {
            users.push({ ...data, uid: doc.id });
          }
        });
        users.sort((a, b) => {
          const tsA = a.lastSeen?.toMillis ? a.lastSeen.toMillis() : (a.lastSeen || 0);
          const tsB = b.lastSeen?.toMillis ? b.lastSeen.toMillis() : (b.lastSeen || 0);
          return tsB - tsA;
        });
        setOnlineUsers(users);
        setLoading(false);
        setRefreshing(false);
      }, () => { setLoading(false); setRefreshing(false); });
    return unsub;
  }, [user?.uid]);

  // جلب الأعضاء الجدد
  const fetchNewUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('profileComplete', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !data.isDeactivated) {
            users.push({ ...data, uid: doc.id });
          }
        });
        setNewUsers(users);
      }, () => {});
    return unsub;
  }, [user?.uid]);

  // جلب كل الأعضاء النشطين
  const fetchAllUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('profileComplete', '==', true)
      .orderBy('lastSeen', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !data.isDeactivated) {
            users.push({ ...data, uid: doc.id });
          }
        });
        setAllUsers(users);
      }, () => {});
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const unsub1 = fetchOnlineUsers();
    const unsub2 = fetchNewUsers();
    const unsub3 = fetchAllUsers();
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [fetchOnlineUsers, fetchNewUsers, fetchAllUsers]);

  const onRefresh = () => { setRefreshing(true); };

  const getCurrentUsers = (): UserProfile[] => {
    let users = activeTab === 'online' ? onlineUsers : activeTab === 'new' ? newUsers : allUsers;
    if (search) {
      users = users.filter(u =>
        (getDisplayName(u) || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.country || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filter === 'online') users = users.filter(u => u.isOnline);
    if (filter === 'male') users = users.filter(u => u.gender === 'male');
    if (filter === 'female') users = users.filter(u => u.gender === 'female');
    return users;
  };

  const openChat = async (otherUser: UserProfile) => {
    if (!user) return;
    try {
      // البحث عن محادثة موجودة
      const q = await firestore()
        .collection('conversations')
        .where('participants', 'array-contains', user.uid)
        .get();
      let existingId: string | null = null;
      q.forEach(doc => {
        if (doc.data().participants?.includes(otherUser.uid)) existingId = doc.id;
      });
      if (!existingId) {
        const newConv = await firestore().collection('conversations').add({
          participants: [user.uid, otherUser.uid],
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastMessageAt: firestore.FieldValue.serverTimestamp(),
          unreadCounts: {},
        });
        existingId = newConv.id;
      }
      navigation.navigate('Chat', {
        conversationId: existingId,
        otherUserId: otherUser.uid,
        userName: getDisplayName(otherUser),
        userPhoto: getAvatar(otherUser) || '',
      });
    } catch (err) {
      console.error('Error opening chat:', err);
    }
  };

  const renderUser = ({ item }: { item: UserProfile }) => {
    const name = getDisplayName(item);
    const avatar = getAvatar(item);
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? COLORS.online : COLORS.offline }]} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{name}</Text>
            {item.isOwner && <Text style={styles.ownerBadge}>👑</Text>}
            {item.isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.info} />}
          </View>
          <View style={styles.userMeta}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.userMetaText} numberOfLines={1}>
              {[item.city, item.country].filter(Boolean).join(', ')}
            </Text>
            {item.age ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.userMetaText}>{item.age} سنة</Text>
              </>
            ) : null}
          </View>
          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => openChat(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const filteredUsers = getCurrentUsers();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Kurdistan Chat</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن أعضاء..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'online', label: `متصل (${onlineUsers.length})` },
          { key: 'new', label: 'جدد' },
          { key: 'all', label: 'الكل' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filters}>
          {(['all', 'online', 'male', 'female'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'الكل' : f === 'online' ? '🟢 متصل' : f === 'male' ? '👨 ذكور' : '👩 إناث'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {search ? 'لا توجد نتائج' : 'لا يوجد أعضاء حالياً'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, margin: SIZES.md,
    borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SIZES.xs },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.textPrimary, fontSize: SIZES.fontMd },
  tabs: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.xs, marginBottom: SIZES.xs },
  tab: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  filtersScroll: { maxHeight: 44 },
  filters: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.xs, marginBottom: SIZES.sm },
  filterBtn: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: SIZES.md, paddingBottom: 80 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd,
    padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarContainer: { position: 'relative', marginRight: SIZES.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bgInput },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.bgCard,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  ownerBadge: { fontSize: 12 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userMetaText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  dot: { color: COLORS.textMuted, fontSize: SIZES.fontXs },
  userBio: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 2 },
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
});
