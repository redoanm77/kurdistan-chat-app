import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Linking,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { COLORS, SIZES } from '../constants/theme';

GoogleSignin.configure({
  webClientId: '814756551942-hufr4kuerljf88jdq73801p5cfodtrhf.apps.googleusercontent.com',
});

type Step = 'main' | 'phone' | 'otp';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('main');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef<any>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || (signInResult as any).idToken;
      if (!idToken) throw new Error('No ID token');
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const result = await auth().signInWithCredential(credential);
      // إنشاء مستخدم جديد في Firestore إذا لم يكن موجوداً
      const userRef = firestore().collection('users').doc(result.user.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        await userRef.set({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || '',
          username: result.user.displayName || result.user.email?.split('@')[0] || 'user',
          photoURL: result.user.photoURL || '',
          avatarUrl: result.user.photoURL || '',
          isOnline: true,
          profileComplete: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastSeen: firestore.FieldValue.serverTimestamp(),
        });
        // إشعار ترحيبي
        await firestore().collection('notifications').add({
          recipientUid: result.user.uid,
          type: 'welcome',
          title: 'مرحباً بك في Kurdistan Chat! 🎉',
          body: 'أهلاً وسهلاً! يمكنك الآن تعديل ملفك الشخصي والتواصل مع الأعضاء.',
          isRead: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('خطأ', 'فشل تسجيل الدخول بـ Google. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      Alert.alert('خطأ', 'أدخل رقم الهاتف');
      return;
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(phone);
      confirmationRef.current = confirmation;
      setStep('otp');
    } catch (error: any) {
      Alert.alert('خطأ', 'فشل إرسال رمز التحقق. تأكد من رقم الهاتف.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpConfirm = async () => {
    if (!otp.trim() || otp.length < 6) {
      Alert.alert('خطأ', 'أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      // إنشاء مستخدم جديد في Firestore إذا لم يكن موجوداً
      const userRef = firestore().collection('users').doc(result.user.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        await userRef.set({
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber,
          displayName: '',
          username: '',
          photoURL: '',
          avatarUrl: '',
          isOnline: true,
          profileComplete: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastSeen: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error: any) {
      Alert.alert('خطأ', 'رمز التحقق غير صحيح. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a1a', '#1a0a35', '#0a0a1a']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {step === 'main' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Text style={styles.cardSubtitle}>مرحباً بك في Kurdistan Chat</Text>

              {/* Google Sign In */}
              <TouchableOpacity
                style={[styles.googleBtn, loading && styles.btnDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.googleBtnText}>الدخول بـ Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Phone Sign In */}
              <TouchableOpacity
                style={styles.phoneBtn}
                onPress={() => setStep('phone')}
                disabled={loading}
              >
                <View style={styles.btnContent}>
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.phoneBtnText}>الدخول برقم الهاتف</Text>
                </View>
              </TouchableOpacity>

              {/* Terms */}
              <Text style={styles.termsText}>
                بالدخول توافق على{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://kurdichat.vip/privacy')}
                >
                  سياسة الخصوصية
                </Text>
                {' '}و{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://kurdichat.vip/terms')}
                >
                  شروط الاستخدام
                </Text>
              </Text>
            </View>
          )}

          {step === 'phone' && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('main')}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
                <Text style={styles.backText}>رجوع</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle}>رقم الهاتف</Text>
              <Text style={styles.cardSubtitle}>أدخل رقم هاتفك مع رمز الدولة</Text>
              <TextInput
                style={styles.input}
                placeholder="+964 7XX XXX XXXX"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="left"
              />
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>إرسال رمز التحقق</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('phone')}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
                <Text style={styles.backText}>رجوع</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle}>رمز التحقق</Text>
              <Text style={styles.cardSubtitle}>أدخل الرمز المرسل إلى {phone}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={COLORS.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleOtpConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>تأكيد الرمز</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.resendBtn}>
                <Text style={styles.resendText}>إعادة إرسال الرمز</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SIZES.lg },
  logoContainer: { alignItems: 'center', marginBottom: SIZES.xl },
  logoImage: { width: 140, height: 140 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary,
    marginBottom: SIZES.xs, textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: SIZES.fontSm, color: COLORS.textSecondary,
    marginBottom: SIZES.lg, textAlign: 'center',
  },
  googleBtn: {
    backgroundColor: '#4285F4',
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.md,
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm },
  googleBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SIZES.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, marginHorizontal: SIZES.sm, fontSize: SIZES.fontSm },
  phoneBtn: {
    backgroundColor: 'transparent',
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  phoneBtnText: { color: COLORS.primary, fontSize: SIZES.fontMd, fontWeight: '600' },
  termsText: {
    fontSize: SIZES.fontXs, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SIZES.lg, lineHeight: 18,
  },
  termsLink: { color: COLORS.primary, textDecorationLine: 'underline' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs, marginBottom: SIZES.lg },
  backText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    color: COLORS.textPrimary,
    fontSize: SIZES.fontMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
  },
  otpInput: { fontSize: SIZES.fontXxl, letterSpacing: 8, textAlign: 'center' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: SIZES.md },
  resendText: { color: COLORS.primary, fontSize: SIZES.fontSm },
});
