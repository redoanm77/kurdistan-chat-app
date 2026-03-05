import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { Conversation, UserProfile } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';

interface ConversationWithUser extends Conversation {
  otherUserProfile?: UserProfile;
}

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('conversations')
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(async snapshot => {
        const convs: ConversationWithUser[] = [];
        const promises = snapshot.docs.map(async doc => {
          const data = doc.data() as Conversation;
          const otherUid = (data.participants || []).find(p => p !== user.uid);
          let otherUserProfile: UserProfile | undefined;
          if (otherUid) {
            try {
              const userDoc = await firestore().collection('users').doc(otherUid).get();
              if (userDoc.exists) {
                otherUserProfile = { ...userDoc.data() as UserProfile, uid: otherUid };
              }
            } catch {}
          }
          convs.push({ ...data, id: doc.id, otherUserProfile });
        });
        await Promise.all(promises);
        convs.sort((a, b) => {
          const tsA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
          const tsB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
          return tsB - tsA;
        });
        setConversations(convs);
        setLoading(false);
      }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const getUnreadCount = (conv: ConversationWithUser): number => {
    if (!user || !conv.unreadCounts) return 0;
    return conv.unreadCounts[user.uid] || 0;
  };

  const formatTime = (ts: any): string => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
    if (diff < 86400000) return date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ar');
  };

  const renderConversation = ({ item }: { item: ConversationWithUser }) => {
    const other = item.otherUserProfile;
    const name = other ? getDisplayName(other) : 'مستخدم';
    const avatar = other ? getAvatar(other) : null;
    const unread = getUnreadCount(item);
    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          otherUserId: other?.uid || '',
          userName: name,
          userPhoto: avatar || '',
        })}
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
          {other?.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.convName} numberOfLines={1}>{name}</Text>
            <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <View style={styles.convFooter}>
            <Text style={styles.convLastMsg} numberOfLines={1}>
              {item.lastMessage || 'ابدأ المحادثة...'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الرسائل</Text>
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>لا توجد محادثات بعد</Text>
              <Text style={styles.emptySubtext}>ابدأ محادثة من صفحة الأعضاء</Text>
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
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: SIZES.xs, paddingBottom: 80 },
  convCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  avatarContainer: { position: 'relative', marginRight: SIZES.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bgInput },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.primary },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.online, borderWidth: 2, borderColor: COLORS.bg,
  },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  convTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLastMsg: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, flex: 1 },
  unreadBadge: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusFull,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: '#fff', fontSize: SIZES.fontXs, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
  emptySubtext: { color: COLORS.textMuted, fontSize: SIZES.fontSm, marginTop: 4 },
});
