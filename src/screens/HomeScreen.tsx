import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, RefreshControl,
  ScrollView, Modal, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile, Story } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

type FilterType = 'all' | 'male' | 'female';
type TabType = 'online' | 'new' | 'all' | 'nearby';

interface StoryGroup {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  stories: Story[];
  hasNew: boolean;
}

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newUsers, setNewUsers] = useState<UserProfile[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('online');

  // Stories
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const progressRef = useRef<any>(null);
  const [uploadingStory, setUploadingStory] = useState(false);

  // Nearby
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearbyRadius] = useState(100);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const fetchOnlineUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('isOnline', '==', true)
      .where('profileComplete', '==', true)
      .limit(200)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !(data as any).isDeactivated) {
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

  const fetchNewUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('profileComplete', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !(data as any).isDeactivated) {
            users.push({ ...data, uid: doc.id });
          }
        });
        setNewUsers(users);
      }, () => {});
    return unsub;
  }, [user?.uid]);

  const fetchAllUsers = useCallback(() => {
    const unsub = firestore()
      .collection('users')
      .where('profileComplete', '==', true)
      .orderBy('lastSeen', 'desc')
      .limit(200)
      .onSnapshot(snapshot => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== user?.uid && !data.isBanned && !(data as any).isDeactivated) {
            users.push({ ...data, uid: doc.id });
          }
        });
        setAllUsers(users);
      }, () => {});
    return unsub;
  }, [user?.uid]);

  const fetchStories = useCallback(() => {
    const unsub = firestore()
      .collection('stories')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(snapshot => {
        const groups: Record<string, StoryGroup> = {};
        snapshot.forEach(doc => {
          const data = doc.data() as any;
          const story: Story = { ...data, id: doc.id };
          if (data.expiresAt) {
            const expMs = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
            if (expMs < Date.now()) return;
          }
          const authorId = data.authorId || data.userId || '';
          if (!authorId) return;
          if (!groups[authorId]) {
            groups[authorId] = {
              authorId,
              authorName: data.authorName || data.userName || 'مستخدم',
              authorAvatar: data.authorAvatar || data.userAvatar,
              stories: [],
              hasNew: false,
            };
          }
          groups[authorId].stories.push(story);
          if (!data.views?.includes(user?.uid || '')) {
            groups[authorId].hasNew = true;
          }
        });
        const sorted = Object.values(groups).sort((a, b) => {
          if (a.hasNew && !b.hasNew) return -1;
          if (!a.hasNew && b.hasNew) return 1;
          return 0;
        });
        setStoryGroups(sorted);
      }, () => {});
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const u1 = fetchOnlineUsers();
    const u2 = fetchNewUsers();
    const u3 = fetchAllUsers();
    const u4 = fetchStories();
    return () => { u1(); u2(); u3(); u4(); };
  }, [fetchOnlineUsers, fetchNewUsers, fetchAllUsers, fetchStories]);

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يجب السماح بالوصول للموقع لعرض الأشخاص القريبين');
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setUserLat(lat);
      setUserLng(lng);
      if (user?.uid) {
        firestore().collection('users').doc(user.uid).update({ latitude: lat, longitude: lng }).catch(() => {});
      }
      const snap = await firestore().collection('users').where('profileComplete', '==', true).limit(500).get();
      const nearby: any[] = [];
      snap.forEach(doc => {
        const data = doc.data() as UserProfile;
        if (data.uid === user?.uid || data.isBanned) return;
        if (data.latitude && data.longitude) {
          const dist = getDistanceKm(lat, lng, data.latitude, data.longitude);
          if (dist <= nearbyRadius) nearby.push({ ...data, uid: doc.id, _distance: dist });
        }
      });
      nearby.sort((a, b) => a._distance - b._distance);
      setNearbyUsers(nearby);
    } catch {
      Alert.alert('خطأ', 'تعذر الحصول على الموقع');
    }
    setLoadingLocation(false);
  };

  const onRefresh = () => setRefreshing(true);

  const getCurrentUsers = (): UserProfile[] => {
    let users: UserProfile[] =
      activeTab === 'online' ? [...onlineUsers] :
      activeTab === 'new' ? [...newUsers] :
      activeTab === 'nearby' ? [...nearbyUsers] :
      [...allUsers];
    if (search.trim()) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        (getDisplayName(u) || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'male') users = users.filter(u => u.gender === 'male');
    if (filter === 'female') users = users.filter(u => u.gender === 'female');
    return users;
  };

  const openChat = async (otherUser: UserProfile) => {
    if (!user) return;
    try {
      const q = await firestore().collection('conversations').where('participants', 'array-contains', user.uid).get();
      let existingId: string | null = null;
      q.forEach(doc => { if (doc.data().participants?.includes(otherUser.uid)) existingId = doc.id; });
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
        conversationId: existingId, otherUserId: otherUser.uid,
        userName: getDisplayName(otherUser), userPhoto: getAvatar(otherUser) || '',
      });
    } catch {}
  };

  const uploadStory = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;
      setUploadingStory(true);
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const path = `stories/${user?.uid}-${Date.now()}.${ext}`;
      const ref = storage().ref(path);
      await ref.putFile(asset.uri);
      const url = await ref.getDownloadURL();
      const name = getDisplayName(userProfile) || 'مستخدم';
      const avatar = getAvatar(userProfile);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await firestore().collection('stories').add({
        authorId: user?.uid, authorName: name, authorAvatar: avatar || null,
        imageUrl: url, mediaType: 'image', views: [], likes: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        expiresAt: firestore.Timestamp.fromDate(expiresAt), friendsOnly: false,
      });
    } catch { Alert.alert('خطأ', 'فشل رفع القصة'); }
    setUploadingStory(false);
  };

  const startStoryTimer = (group: StoryGroup, idx: number) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setStoryProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += 2;
      setStoryProgress(p);
      if (p >= 100) {
        clearInterval(progressRef.current);
        if (idx < group.stories.length - 1) {
          const next = idx + 1;
          setViewingIndex(next);
          if (user?.uid) {
            firestore().collection('stories').doc(group.stories[next].id).update({ views: firestore.FieldValue.arrayUnion(user.uid) }).catch(() => {});
          }
          startStoryTimer(group, next);
        } else setViewingGroup(null);
      }
    }, 100);
  };

  const openStory = (group: StoryGroup) => {
    setViewingGroup(group); setViewingIndex(0); setStoryProgress(0);
    startStoryTimer(group, 0);
    if (user?.uid && group.stories[0]) {
      firestore().collection('stories').doc(group.stories[0].id).update({ views: firestore.FieldValue.arrayUnion(user.uid) }).catch(() => {});
    }
  };

  const closeStory = () => { if (progressRef.current) clearInterval(progressRef.current); setViewingGroup(null); };

  const renderUser = ({ item }: { item: UserProfile }) => {
    const name = getDisplayName(item);
    const avatar = getAvatar(item);
    const dist = (item as any)._distance;
    return (
      <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('UserProfile', { userId: item.uid })} activeOpacity={0.8}>
        <View style={styles.avatarContainer}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> :
            <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text></View>}
          <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? COLORS.online : COLORS.offline }]} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{name}</Text>
            {item.isOwner && <Text>👑</Text>}
            {item.isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.info} />}
          </View>
          <View style={styles.userMeta}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.userMetaText} numberOfLines={1}>{[item.city, item.country].filter(Boolean).join(', ')}</Text>
            {item.age ? <><Text style={styles.dot}>·</Text><Text style={styles.userMetaText}>{item.age} سنة</Text></> : null}
          </View>
          {dist ? <Text style={styles.distanceText}>📍 {Math.round(dist)} كم</Text> :
            item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>
        <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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

      {/* Stories */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
          <TouchableOpacity style={styles.storyItem} onPress={uploadStory} disabled={uploadingStory}>
            <View style={[styles.storyRing, styles.addStoryRing]}>
              {uploadingStory ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                <>
                  {getAvatar(userProfile) ? <Image source={{ uri: getAvatar(userProfile)! }} style={styles.storyAvatar} /> :
                    <View style={[styles.storyAvatar, styles.storyAvatarFallback]}><Text style={styles.storyAvatarInitial}>{getDisplayName(userProfile).charAt(0)}</Text></View>}
                  <View style={styles.addStoryBtn}><Ionicons name="add" size={14} color="#fff" /></View>
                </>
              )}
            </View>
            <Text style={styles.storyName}>قصتي</Text>
          </TouchableOpacity>
          {storyGroups.map(group => (
            <TouchableOpacity key={group.authorId} style={styles.storyItem} onPress={() => openStory(group)}>
              <View style={[styles.storyRing, group.hasNew && styles.storyRingNew]}>
                {group.authorAvatar ? <Image source={{ uri: group.authorAvatar }} style={styles.storyAvatar} /> :
                  <View style={[styles.storyAvatar, styles.storyAvatarFallback]}><Text style={styles.storyAvatarInitial}>{group.authorName.charAt(0)}</Text></View>}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {group.authorId === user?.uid ? 'قصتي' : group.authorName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="ابحث عن أعضاء..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {[
            { key: 'online', label: `متصل (${onlineUsers.length})` },
            { key: 'new', label: 'جدد' },
            { key: 'all', label: 'الكل' },
            { key: 'nearby', label: '📍 قريبون' },
          ].map(tab => (
            <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => { setActiveTab(tab.key as TabType); if (tab.key === 'nearby' && !userLat) handleGetLocation(); }}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Gender Filter */}
      <View style={styles.filterRow}>
        {[{ key: 'all', label: 'الكل' }, { key: 'male', label: '👨 ذكور' }, { key: 'female', label: '👩 إناث' }].map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} onPress={() => setFilter(f.key as FilterType)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nearby Location Prompt */}
      {activeTab === 'nearby' && !userLat && (
        <View style={styles.locationPrompt}>
          <Ionicons name="location-outline" size={50} color={COLORS.primary} />
          <Text style={styles.locationPromptText}>اضغط لتفعيل الموقع وعرض الأشخاص القريبين منك</Text>
          <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation} disabled={loadingLocation}>
            {loadingLocation ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.locationBtnText}>تفعيل الموقع</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (activeTab !== 'nearby' || userLat) ? (
        <FlatList
          data={getCurrentUsers()}
          renderItem={renderUser}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{activeTab === 'nearby' ? 'لا يوجد أشخاص قريبون' : 'لا يوجد أعضاء'}</Text>
            </View>
          }
        />
      ) : null}

      {/* Story Viewer */}
      <Modal visible={!!viewingGroup} transparent animationType="fade" onRequestClose={closeStory}>
        <View style={styles.storyModal}>
          {viewingGroup && (
            <>
              <View style={styles.storyProgressContainer}>
                {viewingGroup.stories.map((_, i) => (
                  <View key={i} style={styles.storyProgressBar}>
                    <View style={[styles.storyProgressFill, { width: i < viewingIndex ? '100%' : i === viewingIndex ? `${storyProgress}%` : '0%' }]} />
                  </View>
                ))}
              </View>
              <View style={styles.storyHeader}>
                <View style={styles.storyHeaderUser}>
                  {viewingGroup.authorAvatar ? <Image source={{ uri: viewingGroup.authorAvatar }} style={styles.storyHeaderAvatar} /> :
                    <View style={[styles.storyHeaderAvatar, styles.storyAvatarFallback]}><Text style={styles.storyAvatarInitial}>{viewingGroup.authorName.charAt(0)}</Text></View>}
                  <Text style={styles.storyHeaderName}>{viewingGroup.authorName}</Text>
                </View>
                <TouchableOpacity onPress={closeStory}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              {viewingGroup.stories[viewingIndex]?.imageUrl ? (
                <Image source={{ uri: viewingGroup.stories[viewingIndex].imageUrl }} style={styles.storyImage} resizeMode="contain" />
              ) : <View style={styles.storyImagePlaceholder}><Ionicons name="image-outline" size={80} color={COLORS.textMuted} /></View>}
              {viewingGroup.stories[viewingIndex]?.caption ? (
                <View style={styles.storyCaptionContainer}><Text style={styles.storyCaption}>{viewingGroup.stories[viewingIndex].caption}</Text></View>
              ) : null}
              <TouchableOpacity style={styles.storyNavLeft} onPress={() => {
                if (viewingIndex > 0) { const p = viewingIndex - 1; setViewingIndex(p); startStoryTimer(viewingGroup, p); }
              }} />
              <TouchableOpacity style={styles.storyNavRight} onPress={() => {
                if (viewingIndex < viewingGroup.stories.length - 1) { const n = viewingIndex + 1; setViewingIndex(n); startStoryTimer(viewingGroup, n); }
                else closeStory();
              }} />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.sm,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.textPrimary },
  storiesContainer: { backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  storiesScroll: { paddingHorizontal: SIZES.sm, paddingVertical: SIZES.sm },
  storyItem: { alignItems: 'center', width: 64, marginHorizontal: 4 },
  storyRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  storyRingNew: { borderColor: COLORS.primary },
  addStoryRing: { borderColor: COLORS.border },
  storyAvatar: { width: 52, height: 52, borderRadius: 26 },
  storyAvatarFallback: { backgroundColor: COLORS.primary + '40', justifyContent: 'center', alignItems: 'center' },
  storyAvatarInitial: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.primary },
  storyName: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  addStoryBtn: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.bgCard },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, marginHorizontal: SIZES.md, marginVertical: SIZES.sm, paddingHorizontal: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: SIZES.sm },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: SIZES.fontMd, paddingVertical: SIZES.sm },
  tabsScroll: { flexGrow: 0 },
  tabs: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.xs, paddingBottom: SIZES.xs },
  tab: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: SIZES.md, gap: SIZES.xs, marginBottom: SIZES.xs },
  filterBtn: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  filterText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  filterTextActive: { color: COLORS.primary, fontWeight: '600' },
  locationPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xl },
  locationPromptText: { color: COLORS.textSecondary, fontSize: SIZES.fontMd, textAlign: 'center', marginVertical: SIZES.md },
  locationBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull },
  locationBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontMd },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: SIZES.xs, paddingBottom: 80 },
  userCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarContainer: { position: 'relative', marginRight: SIZES.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bgInput },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.bg },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  userName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  userMetaText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  dot: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginHorizontal: 2 },
  userBio: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  distanceText: { fontSize: SIZES.fontXs, color: COLORS.primary, marginTop: 2 },
  chatBtn: { padding: SIZES.sm },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
  storyModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  storyProgressContainer: { position: 'absolute', top: 50, left: 8, right: 8, flexDirection: 'row', gap: 4, zIndex: 10 },
  storyProgressBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  storyProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  storyHeader: { position: 'absolute', top: 64, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  storyHeaderUser: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  storyHeaderAvatar: { width: 36, height: 36, borderRadius: 18 },
  storyHeaderName: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontMd },
  storyImage: { width: '100%', height: '100%' },
  storyImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  storyCaptionContainer: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: SIZES.md },
  storyCaption: { color: '#fff', fontSize: SIZES.fontMd, textAlign: 'center' },
  storyNavLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%' },
  storyNavRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%' },
});
