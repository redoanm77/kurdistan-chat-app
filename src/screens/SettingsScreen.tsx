import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Alert, Switch, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

const OWNER_EMAIL = 'redoan1999redoan@gmail.com';

export default function SettingsScreen({ navigation }: any) {
  const { user, userProfile, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('ar');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessages: 'all' as 'all' | 'friends' | 'none',
    showLocation: true,
    showAge: true,
    showInstagram: true,
  });
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);

  const isOwner = user?.email === OWNER_EMAIL || userProfile?.isOwner || userProfile?.role === 'admin';

  useEffect(() => {
    loadNotificationStatus();
    loadPrivacySettings();
  }, []);

  const loadNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch {}
  };

  const loadPrivacySettings = async () => {
    if (!user) return;
    try {
      const doc = await firestore().collection('privacySettings').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        setPrivacySettings(prev => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const toggleNotifications = async () => {
    try {
      if (!notificationsEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setNotificationsEnabled(true);
          // حفظ FCM token
          const token = await messaging().getToken();
          if (user && token) {
            await firestore().collection('fcmTokens').doc(user.uid).set({
              uid: user.uid, token, platform: 'android', updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            await firestore().collection('users').doc(user.uid).update({ fcmToken: token });
          }
          Alert.alert('✅', 'تم تفعيل الإشعارات بنجاح');
        } else {
          Alert.alert('تنبيه', 'يجب السماح بالإشعارات من إعدادات الهاتف');
        }
      } else {
        setNotificationsEnabled(false);
        if (user) {
          await firestore().collection('fcmTokens').doc(user.uid).delete().catch(() => {});
          await firestore().collection('users').doc(user.uid).update({ fcmToken: null });
        }
        Alert.alert('ℹ️', 'تم إيقاف الإشعارات');
      }
    } catch {}
  };

  const testNotification = async () => {
    setTestingNotif(true);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kurdistan Chat 🔔',
          body: 'الإشعارات تعمل بشكل صحيح ✅',
          sound: true,
        },
        trigger: { seconds: 2 },
      });
      Alert.alert('✅', 'سيصلك إشعار تجريبي خلال ثانيتين');
    } catch {
      Alert.alert('خطأ', 'فشل إرسال الإشعار التجريبي');
    }
    setTestingNotif(false);
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    setLoadingPrivacy(true);
    try {
      await firestore().collection('privacySettings').doc(user.uid).set(privacySettings);
      await firestore().collection('users').doc(user.uid).update({
        showOnlineStatus: privacySettings.showOnlineStatus,
        showLastSeen: privacySettings.showLastSeen,
      });
      setShowPrivacyModal(false);
      Alert.alert('✅', 'تم حفظ إعدادات الخصوصية');
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الإعدادات');
    }
    setLoadingPrivacy(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'احذف') {
      Alert.alert('خطأ', 'يجب كتابة كلمة "احذف" للتأكيد');
      return;
    }
    setDeleting(true);
    try {
      if (!user) return;
      const uid = user.uid;
      // حذف البيانات من Firestore
      const batch = firestore().batch();
      batch.delete(firestore().collection('users').doc(uid));
      batch.delete(firestore().collection('userPoints').doc(uid));
      batch.delete(firestore().collection('fcmTokens').doc(uid));
      batch.delete(firestore().collection('privacySettings').doc(uid));
      await batch.commit();
      // حذف الإشعارات
      const notifSnap = await firestore().collection('notifications').where('recipientUid', '==', uid).limit(100).get();
      const batch2 = firestore().batch();
      notifSnap.docs.forEach(d => batch2.delete(d.ref));
      await batch2.commit();
      // حذف حساب Firebase Auth
      await auth().currentUser?.delete();
      Alert.alert('تم', 'تم حذف حسابك نهائياً');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        Alert.alert('تنبيه', 'يجب تسجيل الدخول مجدداً قبل حذف الحساب. سيتم تسجيل خروجك الآن.', [
          { text: 'موافق', onPress: signOut }
        ]);
      } else {
        Alert.alert('خطأ', 'فشل حذف الحساب. حاول مجدداً.');
      }
    }
    setDeleting(false);
    setShowDeleteModal(false);
  };

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  };

  const SettingItem = ({ icon, label, onPress, danger, rightElement, subtitle }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Ionicons name={icon} size={22} color={danger ? COLORS.error : COLORS.primary} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemText, danger && { color: COLORS.error }]}>{label}</Text>
        {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* الحساب */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الحساب</Text>
        <SettingItem icon="pencil-outline" label="تعديل الملف الشخصي" onPress={() => navigation.navigate('EditProfile')} />
        <SettingItem icon="shield-checkmark-outline" label="إعدادات الخصوصية" onPress={() => setShowPrivacyModal(true)} subtitle="التحكم بمن يرى معلوماتك" />
      </View>

      {/* الإشعارات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإشعارات</Text>
        <SettingItem
          icon="notifications-outline"
          label="الإشعارات"
          subtitle={notificationsEnabled ? 'مفعّلة' : 'معطّلة'}
          rightElement={<Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />}
        />
        <SettingItem
          icon="flask-outline"
          label="اختبار الإشعارات"
          subtitle="إرسال إشعار تجريبي"
          onPress={testNotification}
          rightElement={testingNotif ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
        />
      </View>

      {/* المظهر واللغة */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>المظهر</Text>
        <SettingItem
          icon="moon-outline"
          label="الوضع الداكن العميق"
          subtitle={darkMode ? 'مفعّل' : 'معطّل'}
          rightElement={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />}
        />
        <SettingItem
          icon="language-outline"
          label="اللغة"
          subtitle={language === 'ar' ? 'العربية' : language === 'ku' ? 'کوردی' : 'English'}
          onPress={() => {
            Alert.alert('اختر اللغة', '', [
              { text: 'العربية', onPress: () => setLanguage('ar') },
              { text: 'کوردی', onPress: () => setLanguage('ku') },
              { text: 'English', onPress: () => setLanguage('en') },
              { text: 'إلغاء', style: 'cancel' },
            ]);
          }}
        />
      </View>

      {/* لوحة الإدارة */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإدارة</Text>
          <SettingItem
            icon="shield-outline"
            label="لوحة الإدارة"
            subtitle="إدارة المستخدمين والمحتوى"
            onPress={() => navigation.navigate('AdminPanel')}
          />
        </View>
      )}

      {/* الدعم */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الدعم والمعلومات</Text>
        <SettingItem icon="information-circle-outline" label="من نحن" onPress={() => navigation.navigate('AboutUs')} />
        <SettingItem icon="mail-outline" label="تواصل معنا" onPress={() => navigation.navigate('ContactUs')} />
        <SettingItem icon="globe-outline" label="زيارة الموقع" onPress={() => Linking.openURL('https://kurdichat.vip')} />
        <SettingItem icon="shield-checkmark-outline" label="سياسة الخصوصية" onPress={() => Linking.openURL('https://kurdichat.vip/privacy')} />
        <SettingItem icon="document-text-outline" label="شروط الاستخدام" onPress={() => Linking.openURL('https://kurdichat.vip/terms')} />
      </View>

      {/* الخروج والحذف */}
      <View style={styles.section}>
        <SettingItem icon="log-out-outline" label="تسجيل الخروج" onPress={handleSignOut} danger />
        <SettingItem
          icon="trash-outline"
          label="حذف الحساب نهائياً"
          subtitle="لا يمكن التراجع عن هذا الإجراء"
          onPress={() => setShowDeleteModal(true)}
          danger
        />
      </View>

      <Text style={styles.version}>Kurdistan Chat v2.1</Text>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إعدادات الخصوصية</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { key: 'showOnlineStatus', label: 'إظهار حالة الاتصال' },
                { key: 'showLastSeen', label: 'إظهار آخر ظهور' },
                { key: 'showLocation', label: 'إظهار الموقع' },
                { key: 'showAge', label: 'إظهار العمر' },
                { key: 'showInstagram', label: 'إظهار حساب Instagram' },
              ].map(item => (
                <View key={item.key} style={styles.privacyRow}>
                  <Text style={styles.privacyLabel}>{item.label}</Text>
                  <Switch
                    value={(privacySettings as any)[item.key]}
                    onValueChange={v => setPrivacySettings(prev => ({ ...prev, [item.key]: v }))}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>السماح بالرسائل من</Text>
                <View style={styles.privacyOptions}>
                  {[{ key: 'all', label: 'الجميع' }, { key: 'friends', label: 'الأصدقاء' }, { key: 'none', label: 'لا أحد' }].map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.privacyOption, privacySettings.allowMessages === opt.key && styles.privacyOptionActive]}
                      onPress={() => setPrivacySettings(prev => ({ ...prev, allowMessages: opt.key as any }))}
                    >
                      <Text style={[styles.privacyOptionText, privacySettings.allowMessages === opt.key && { color: '#fff' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={savePrivacySettings} disabled={loadingPrivacy}>
              {loadingPrivacy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.error }]}>حذف الحساب نهائياً</Text>
              <TouchableOpacity onPress={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.deleteWarning}>
              سيتم حذف حسابك وجميع بياناتك نهائياً بما فيها الصور والرسائل والإشعارات. هذا الإجراء لا يمكن التراجع عنه.
            </Text>
            <Text style={styles.deleteConfirmLabel}>اكتب كلمة "احذف" للتأكيد:</Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder='اكتب "احذف"'
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity
              style={[styles.deleteBtn, (deleteConfirm !== 'احذف' || deleting) && styles.deleteBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleteConfirm !== 'احذف' || deleting}
            >
              {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteBtnText}>حذف الحساب نهائياً</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  section: { backgroundColor: COLORS.bgCard, marginTop: SIZES.md, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, overflow: 'hidden' },
  sectionTitle: { fontSize: SIZES.fontXs, color: COLORS.textMuted, fontWeight: '600', paddingHorizontal: SIZES.md, paddingTop: SIZES.md, paddingBottom: SIZES.xs, textTransform: 'uppercase', letterSpacing: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, paddingHorizontal: SIZES.md, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemContent: { flex: 1 },
  itemText: { fontSize: SIZES.fontMd, color: COLORS.textPrimary },
  itemSubtitle: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: SIZES.fontSm, marginTop: SIZES.xl, marginBottom: SIZES.lg },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  modalTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  // Privacy
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  privacyLabel: { fontSize: SIZES.fontMd, color: COLORS.textPrimary, flex: 1 },
  privacyOptions: { flexDirection: 'row', gap: SIZES.xs },
  privacyOption: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border },
  privacyOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  privacyOptionText: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, alignItems: 'center', marginTop: SIZES.md },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontMd },
  // Delete
  deleteWarning: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.md, lineHeight: 22 },
  deleteConfirmLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginBottom: SIZES.xs },
  deleteInput: { backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, color: COLORS.textPrimary, fontSize: SIZES.fontMd, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.md },
  deleteBtn: { backgroundColor: COLORS.error, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, alignItems: 'center' },
  deleteBtnDisabled: { backgroundColor: COLORS.error + '50' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontMd },
});
