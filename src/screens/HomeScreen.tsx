import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { COLLECTIONS } from '../lib/firebase';

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'male' | 'female'>('all');

  const fetchUsers = async () => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('profileComplete', '==', true)
        .where('isBlocked', '==', false)
        .orderBy('lastSeen', 'desc')
        .limit(50)
        .get();

      const fetchedUsers = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== user?.uid);

      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.city?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'online' ? u.isOnline :
      filter === 'male' ? u.gender === 'male' :
      filter === 'female' ? u.gender === 'female' : true;
    return matchesSearch && matchesFilter;
  });

  const renderUser = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.photoURL || '' }} style={styles.avatar} />
        <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? COLORS.online : COLORS.offline }]} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <View style={styles.userMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.userMetaText}>{item.city}, {item.country}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.userMetaText}>{item.age} سنة</Text>
        </View>
        {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => navigation.navigate('Chat', {
          userId: item.uid,
          userName: item.displayName,
          userPhoto: item.photoURL || '',
        })}
      >
        <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kurdistan Chat</Text>
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
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'online', 'male', 'female'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'الكل' : f === 'online' ? 'متصل' : f === 'male' ? 'ذكور' : 'إناث'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>لا يوجد أعضاء حالياً</Text>
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
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, margin: SIZES.md,
    borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SIZES.xs },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.textPrimary, fontSize: SIZES.fontMd },

  filters: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.xs, marginBottom: SIZES.sm },
  filterBtn: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
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
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.bgCard,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
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
