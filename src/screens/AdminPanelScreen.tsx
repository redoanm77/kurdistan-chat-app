import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Image, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

const OWNER_EMAIL = 'redoan1999redoan@gmail.com';

export default function AdminPanelScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'messages' | 'notifications'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalMessages: 0 });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [warningText, setWarningText] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [contactMessages, setContactMessages] = useState<any[]>([]);

  // التحقق من الصلاحيات
  if (user?.email !== OWNER_EMAIL) {
    return (
      <View style={styles.noAccess}>
        <Ionicons name="lock-closed" size={60} color={COLORS.error} />
        <Text style={styles.noAccessText}>غير مصرح لك بالوصول</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  useEffect(() => {
    loadUsers();
    loadStats();
    loadContactMessages();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(u =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const snap = await firestore().collection('users').orderBy('createdAt', 'desc').limit(200).get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setFilteredUsers(list);
    } catch {}
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const [usersSnap, onlineSnap] = await Promise.all([
        firestore().collection('users').count().get(),
        firestore().collection('users').where('isOnline', '==', true).count().get(),
      ]);
      setStats({
        totalUsers: (usersSnap as any).data().count,
        onlineUsers: (onlineSnap as any).data().count,
        totalMessages: 0,
      });
    } catch {}
  };

  const loadContactMessages = async () => {
    try {
      const snap = await firestore().collection('contactMessages').orderBy('createdAt', 'desc').limit(50).get();
      setContactMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  };

  const sendWarning = async () => {
    if (!selectedUser || !warningText.trim()) return;
    setSendingWarning(true);
    try {
      await firestore().collection('notifications').add({
        recipientUid: selectedUser.id,
        type: 'warning',
        title: '⚠️ تحذير من الإدارة',
        body: warningText.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        read: false,
      });
      Alert.alert('✅', `تم إرسال التحذير لـ ${selectedUser.displayName || selectedUser.username}`);
      setShowWarningModal(false);
      setWarningText('');
    } catch {
      Alert.alert('خطأ', 'فشل إرسال التحذير');
    }
    setSendingWarning(false);
  };

  const banUser = async (userId: string, username: string) => {
    Alert.alert('حظر المستخدم', `هل تريد حظر ${username}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حظر', style: 'destructive', onPress: async () => {
          try {
            await firestore().collection('users').doc(userId).update({ isBanned: true });
            Alert.alert('✅', 'تم حظر المستخدم');
            loadUsers();
          } catch { Alert.alert('خطأ', 'فشل الحظر'); }
        }
      }
    ]);
  };

  const sendBroadcastNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert('تنبيه', 'يرجى ملء العنوان والمحتوى');
      return;
    }
    setSendingNotif(true);
    try {
      // حفظ الإشعار العام في Firestore ليُرسل عبر Cloud Functions
      await firestore().collection('broadcastNotifications').add({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        sentBy: user?.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        status: 'pending',
      });
      Alert.alert('✅', 'تم إرسال الإشعار لجميع المستخدمين');
      setNotifTitle('');
      setNotifBody('');
    } catch {
      Alert.alert('خطأ', 'فشل إرسال الإشعار');
    }
    setSendingNotif(false);
  };

  const renderUser = ({ item }: any) => (
    <View style={styles.userRow}>
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.userAvatarFallback]}>
          <Text style={styles.userAvatarInitial}>{(item.displayName || item.username || '?').charAt(0)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.username || 'مجهول'}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email || item.city || ''}</Text>
        {item.isBanned && <Text style={styles.bannedBadge}>محظور</Text>}
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => { setSelectedUser(item); setShowWarningModal(true); }}
        >
          <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => banUser(item.id, item.displayName || item.username || 'المستخدم')}
        >
          <Ionicons name="ban-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>لوحة الإدارة 👑</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'users', label: 'المستخدمون', icon: 'people-outline' },
          { key: 'stats', label: 'الإحصائيات', icon: 'bar-chart-outline' },
          { key: 'notifications', label: 'الإشعارات', icon: 'notifications-outline' },
          { key: 'messages', label: 'الرسائل', icon: 'mail-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <View style={styles.flex}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="بحث بالاسم أو الإيميل..."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <Text style={styles.countText}>{filteredUsers.length} مستخدم</Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUser}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: SIZES.md }}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color={COLORS.primary} />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="radio-button-on" size={32} color={COLORS.online} />
              <Text style={styles.statValue}>{stats.onlineUsers}</Text>
              <Text style={styles.statLabel}>متصل الآن</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { loadStats(); loadUsers(); }}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshBtnText}>تحديث الإحصائيات</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: SIZES.md }}>
          <Text style={styles.sectionTitle}>إرسال إشعار لجميع المستخدمين</Text>
          <TextInput
            style={styles.input}
            value={notifTitle}
            onChangeText={setNotifTitle}
            placeholder="عنوان الإشعار..."
            placeholderTextColor={COLORS.textMuted}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notifBody}
            onChangeText={setNotifBody}
            placeholder="محتوى الإشعار..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!notifTitle.trim() || !notifBody.trim() || sendingNotif) && styles.sendBtnDisabled]}
            onPress={sendBroadcastNotification}
            disabled={!notifTitle.trim() || !notifBody.trim() || sendingNotif}
          >
            {sendingNotif ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>إرسال للجميع</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Contact Messages Tab */}
      {activeTab === 'messages' && (
        <FlatList
          data={contactMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SIZES.md }}
          renderItem={({ item }) => (
            <View style={styles.msgCard}>
              <View style={styles.msgCardHeader}>
                <Text style={styles.msgUsername}>{item.username}</Text>
                <Text style={styles.msgDate}>{item.createdAt?.toDate?.()?.toLocaleDateString('ar') || ''}</Text>
              </View>
              <Text style={styles.msgSubject}>{item.subject}</Text>
              <Text style={styles.msgBody}>{item.message}</Text>
              {item.email && <Text style={styles.msgEmail}>{item.email}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد رسائل</Text>}
        />
      )}

      {/* Warning Modal */}
      <Modal visible={showWarningModal} transparent animationType="slide" onRequestClose={() => setShowWarningModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إرسال تحذير لـ {selectedUser?.displayName || selectedUser?.username}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={warningText}
              onChangeText={setWarningText}
              placeholder="نص التحذير..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowWarningModal(false); setWarningText(''); }}>
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warnBtn, (!warningText.trim() || sendingWarning) && styles.sendBtnDisabled]}
                onPress={sendWarning}
                disabled={!warningText.trim() || sendingWarning}
              >
                {sendingWarning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendBtnText}>إرسال</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  noAccess: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, gap: SIZES.md },
  noAccessText: { fontSize: SIZES.fontXl, color: COLORS.error, fontWeight: 'bold' },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd },
  backBtnText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SIZES.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, backgroundColor: COLORS.bgInput, margin: SIZES.md, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: SIZES.fontSm, paddingVertical: SIZES.sm },
  countText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, paddingHorizontal: SIZES.md, marginBottom: SIZES.xs },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SIZES.sm },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  userAvatarFallback: { backgroundColor: COLORS.primary + '40', justifyContent: 'center', alignItems: 'center' },
  userAvatarInitial: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textPrimary },
  userEmail: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  bannedBadge: { fontSize: SIZES.fontXs, color: COLORS.error, fontWeight: '600' },
  userActions: { flexDirection: 'row', gap: SIZES.xs },
  actionIconBtn: { padding: 6, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusSm },
  statsGrid: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.md },
  statCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md, alignItems: 'center', gap: SIZES.xs },
  statValue: { fontSize: SIZES.fontTitle, fontWeight: 'bold', color: COLORS.textPrimary },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md },
  refreshBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontSm },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  input: { backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, color: COLORS.textPrimary, fontSize: SIZES.fontSm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  textArea: { height: 100, paddingTop: SIZES.sm },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontSm },
  msgCard: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm },
  msgCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  msgUsername: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.primary },
  msgDate: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  msgSubject: { fontSize: SIZES.fontSm, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  msgBody: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, lineHeight: 18 },
  msgEmail: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: SIZES.fontMd },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.lg },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  modalBtns: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.sm },
  cancelBtn: { flex: 1, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  warnBtn: { flex: 1, backgroundColor: COLORS.warning, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, alignItems: 'center' },
});
