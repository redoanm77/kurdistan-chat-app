import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

export default function ContactUsScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول');
      return;
    }
    setSending(true);
    try {
      await firestore().collection('contactMessages').add({
        uid: user?.uid || null,
        username: userProfile?.username || userProfile?.displayName || 'مجهول',
        email: user?.email || null,
        subject: subject.trim(),
        message: message.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        status: 'pending',
      });
      Alert.alert('✅ تم الإرسال', 'شكراً لتواصلك معنا! سنرد عليك في أقرب وقت ممكن.');
      setSubject('');
      setMessage('');
    } catch {
      Alert.alert('خطأ', 'فشل إرسال الرسالة. حاول مجدداً.');
    }
    setSending(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تواصل معنا</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          هل واجهت مشكلة؟ هل لديك اقتراح؟ تواصل معنا وسنرد عليك في أقرب وقت ممكن.
        </Text>
      </View>

      {/* Quick Contact */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>تواصل سريع</Text>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('https://instagram.com/redoan.m7')}>
          <Ionicons name="logo-instagram" size={22} color="#E1306C" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Instagram</Text>
            <Text style={styles.contactValue}>@redoan.m7</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:redoan1999redoan@gmail.com')}>
          <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>البريد الإلكتروني</Text>
            <Text style={styles.contactValue}>redoan1999redoan@gmail.com</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Contact Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>إرسال رسالة</Text>
        <Text style={styles.label}>الموضوع</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="موضوع رسالتك..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={100}
        />
        <Text style={styles.label}>الرسالة</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!subject.trim() || !message.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!subject.trim() || !message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>إرسال</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  infoCard: { backgroundColor: COLORS.primary + '20', margin: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, borderWidth: 1, borderColor: COLORS.primary + '40' },
  infoText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 22 },
  card: { backgroundColor: COLORS.bgCard, marginHorizontal: SIZES.md, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md },
  cardTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  contactValue: { fontSize: SIZES.fontSm, color: COLORS.textPrimary, fontWeight: '500' },
  label: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.xs, marginTop: SIZES.sm },
  input: { backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, color: COLORS.textPrimary, fontSize: SIZES.fontSm, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 120, paddingTop: SIZES.sm },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, marginTop: SIZES.md },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: SIZES.fontMd },
});
