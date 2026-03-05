import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { AppNotification } from '../types';

const NOTIFICATION_ICONS: Record<string, { icon: string; color: string }> = {
  welcome: { icon: '🎉', color: COLORS.success },
  message: { icon: '💬', color: COLORS.primary },
  friend_request: { icon: '👋', color: COLORS.info },
  friend_accepted: { icon: '✅', color: COLORS.success },
  mention: { icon: '@', color: COLORS.accent },
  like: { icon: '❤️', color: COLORS.error },
  profile_visit: { icon: '👁️', color: COLORS.textSecondary },
  story_view: { icon: '📖', color: COLORS.primaryLight },
  default: { icon: '🔔', color: COLORS.primary },
};

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('notifications')
      .where('recipientUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        const notifs: AppNotification[] = [];
        snapshot.forEach(doc => {
          notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
        });
        setNotifications(notifs);
        setLoading(false);
      }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.isRead && !n.read);
    const batch = firestore().batch();
    unread.forEach(n => {
      batch.update(firestore().collection('notifications').doc(n.id), { isRead: true });
    });
    await batch.commit().catch(() => {});
  };

  const markRead = async (notif: AppNotification) => {
    if (!notif.isRead && !notif.read) {
      await firestore().collection('notifications').doc(notif.id).update({ isRead: true }).catch(() => {});
    }
  };

  const formatTime = (ts: any): string => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    if (diff < 604800000) return `منذ ${Math.floor(diff / 86400000)} يوم`;
    return date.toLocaleDateString('ar');
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const iconInfo = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.default;
    const isRead = item.isRead || item.read;
    return (
      <TouchableOpacity
        style={[styles.notifCard, !isRead && styles.notifCardUnread]}
        onPress={() => markRead(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconInfo.color + '20' }]}>
          <Text style={styles.iconText}>{iconInfo.icon}</Text>
        </View>
        <View style={styles.notifContent}>
          {item.title && <Text style={styles.notifTitle}>{item.title}</Text>}
          {item.body && <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>}
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>تحديد الكل كمقروء</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>لا توجد إشعارات</Text>
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
  markAllBtn: { paddingHorizontal: SIZES.sm, paddingVertical: 4 },
  markAllText: { color: COLORS.primary, fontSize: SIZES.fontSm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: SIZES.xs, paddingBottom: 80 },
  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  notifCardUnread: { backgroundColor: COLORS.primary + '08' },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SIZES.md,
  },
  iconText: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  notifBody: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 4 },
  notifTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginLeft: SIZES.sm,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
});
