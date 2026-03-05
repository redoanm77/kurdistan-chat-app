import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Image, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { COLORS, SIZES } from '../constants/theme';

GoogleSignin.configure({
  webClientId: '814756551942-hufr4kuerljf88jdq73801p5cfodtrhf.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

// روابط الخصوصية وشروط الاستخدام
const PRIVACY_URL = 'https://kurdichat.vip/privacy';
const TERMS_URL = 'https://kurdichat.vip/terms';

type Step = 'main' | 'phone' | 'otp';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('main');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut(); // تسجيل خروج سابق لضمان اختيار حساب جديد
      const { data } = await GoogleSignin.signIn();
      if (!data?.idToken) {
        throw new Error('No ID token received');
      }
      const googleCredential = auth.GoogleAuthProvider.credential(data.idToken);
      await auth().signInWithCredential(googleCredential);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // المستخدم ألغى تسجيل الدخول
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('تنبيه', 'تسجيل الدخول جارٍ بالفعل، يرجى الانتظار.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('خطأ', 'خدمات Google Play غير متوفرة على هذا الجهاز.');
      } else {
        Alert.alert('خطأ', 'فشل تسجيل الدخول بـ Google. حاول مرة أخرى.');
        console.error('Google Sign-In error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 8) {
      Alert.alert('خطأ', 'أدخل رقم هاتف صحيح مع رمز الدولة (مثال: +9647xxxxxxxx)');
      return;
    }
    if (!trimmedPhone.startsWith('+')) {
      Alert.alert('خطأ', 'يجب أن يبدأ رقم الهاتف بـ + ورمز الدولة (مثال: +9647xxxxxxxx)');
      return;
    }
    try {
      setLoading(true);
      const confirmation = await auth().signInWithPhoneNumber(trimmedPhone);
      setConfirm(confirmation);
      setStep('otp');
    } catch (error: any) {
      console.error('Phone auth error:', error);
      if (error.code === 'auth/invalid-phone-number') {
        Alert.alert('خطأ', 'رقم الهاتف غير صحيح. تأكد من إدخال رمز الدولة.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('خطأ', 'تم إرسال طلبات كثيرة. حاول لاحقاً.');
      } else if (error.code === 'auth/quota-exceeded') {
        Alert.alert('خطأ', 'تم تجاوز الحد المسموح. حاول لاحقاً.');
      } else {
        Alert.alert('خطأ', 'فشل إرسال رمز التحقق. تأكد من رقم الهاتف ورمز الدولة.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpConfirm = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('خطأ', 'أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }
    try {
      setLoading(true);
      await confirm.confirm(otp);
    } catch (error: any) {
      console.error('OTP error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('خطأ', 'رمز التحقق غير صحيح. حاول مرة أخرى.');
      } else if (error.code === 'auth/code-expired') {
        Alert.alert('خطأ', 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.');
      } else {
        Alert.alert('خطأ', 'فشل التحقق. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح الرابط');
    });
  };

  const openTerms = () => {
    Linking.openURL(TERMS_URL).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح الرابط');
    });
  };

  return (
    <LinearGradient colors={['#0a0a1a', '#12122a', '#0a0a1a']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          {step === 'main' && (
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>K</Text>
              </View>
              <Text style={styles.appName}>Kurdistan Chat</Text>
              <Text style={styles.appSubtitle}>تواصل مع الأعضاء من حولك</Text>
            </View>
          )}

          {/* Main Step */}
          {step === 'main' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Text style={styles.cardSubtitle}>اختر طريقة تسجيل الدخول</Text>

              <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={loading}>
                <View style={styles.btnContent}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={22} color="#fff" />
                      <Text style={styles.googleBtnText}>متابعة بـ Google</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.phoneBtn} onPress={() => setStep('phone')} disabled={loading}>
                <View style={styles.btnContent}>
                  <Ionicons name="phone-portrait-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.phoneBtnText}>متابعة برقم الهاتف</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                بالمتابعة، أنت توافق على{' '}
                <Text style={styles.termsLink} onPress={openTerms}>شروط الاستخدام</Text>
                {' '}و{' '}
                <Text style={styles.termsLink} onPress={openPrivacy}>سياسة الخصوصية</Text>
              </Text>
            </View>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('main')}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
                <Text style={styles.backText}>رجوع</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle}>رقم الهاتف</Text>
              <Text style={styles.cardSubtitle}>أدخل رقمك مع رمز الدولة</Text>
              <TextInput
                style={styles.input}
                placeholder="+9647xxxxxxxx"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                textContentType="telephoneNumber"
              />
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>إرسال الرمز</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OTP Step */}
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
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
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
  logoContainer: { alignItems: 'center', marginBottom: SIZES.xxl },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SIZES.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  logoText: { fontSize: 42, fontWeight: 'bold', color: '#fff' },
  appName: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  appSubtitle: { fontSize: SIZES.fontMd, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.xs, textAlign: 'center' },
  cardSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.lg, textAlign: 'center' },
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
  termsText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center', marginTop: SIZES.lg, lineHeight: 18 },
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
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: SIZES.md },
  resendText: { color: COLORS.primary, fontSize: SIZES.fontSm },
});
