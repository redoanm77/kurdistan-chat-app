import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

const KURDISH_REGIONS = [
  { label: 'روژئافا — Rojava', value: 'Rojava' },
  { label: 'باشووری كوردستان — South Kurdistan', value: 'South Kurdistan' },
  { label: 'باكووری كوردستان — North Kurdistan', value: 'North Kurdistan' },
  { label: 'ڕۆژهەڵاتی كوردستان — East Kurdistan', value: 'East Kurdistan' },
];

const COUNTRIES = [
  ...KURDISH_REGIONS,
  { label: 'سوریا — Syria', value: 'Syria' },
  { label: 'عراق — Iraq', value: 'Iraq' },
  { label: 'تركيا — Turkey', value: 'Turkey' },
  { label: 'إيران — Iran', value: 'Iran' },
  { label: 'ألمانيا — Germany', value: 'Germany' },
  { label: 'السويد — Sweden', value: 'Sweden' },
  { label: 'هولندا — Netherlands', value: 'Netherlands' },
  { label: 'النمسا — Austria', value: 'Austria' },
  { label: 'بلجيكا — Belgium', value: 'Belgium' },
  { label: 'فرنسا — France', value: 'France' },
  { label: 'المملكة المتحدة — UK', value: 'UK' },
  { label: 'الدنمارك — Denmark', value: 'Denmark' },
  { label: 'النرويج — Norway', value: 'Norway' },
  { label: 'كندا — Canada', value: 'Canada' },
  { label: 'أمريكا — USA', value: 'USA' },
  { label: 'أستراليا — Australia', value: 'Australia' },
];

const INTERESTS = [
  'Muzik', 'Werzish', 'Geryan', 'Xwarinpêjtin', 'Xwendin',
  'Wênekêşan', 'Xêzkirin', 'Lîstik', 'Sînema', 'Teknolojî',
  'Xweza', 'Huner', 'Helbest', 'Dîrok', 'Ziman', 'Pêşveçûna Xwe',
];

export default function CompleteProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: '',
    bio: '',
    age: '',
    gender: '' as 'male' | 'female' | '',
    country: '',
    city: '',
    interests: [] as string[],
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showCountries, setShowCountries] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (!form.username.trim()) return Alert.alert('خطأ', 'أدخل اسم المستخدم');
    if (!form.age || parseInt(form.age) < 18) return Alert.alert('خطأ', 'يجب أن يكون عمرك 18 سنة أو أكثر');
    if (!form.gender) return Alert.alert('خطأ', 'اختر الجنس');
    if (!form.country) return Alert.alert('خطأ', 'اختر البلد');
    if (!form.city.trim()) return Alert.alert('خطأ', 'أدخل المدينة');
    if (!avatar) return Alert.alert('خطأ', 'أضف صورة شخصية');

    setLoading(true);
    try {
      let photoURL = '';
      // رفع الصورة
      const response = await fetch(avatar);
      const blob = await response.blob();
      const ext = avatar.split('.').pop() || 'jpg';
      const storageRef = storage().ref(`avatars/${user!.uid}.${ext}`);
      await storageRef.put(blob);
      photoURL = await storageRef.getDownloadURL();

      // تحديث الملف الشخصي في Firestore
      await firestore().collection('users').doc(user!.uid).set({
        uid: user!.uid,
        username: form.username.trim(),
        displayName: form.username.trim(),
        bio: form.bio.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        country: form.country,
        city: form.city.trim(),
        interests: form.interests,
        photoURL,
        avatarUrl: photoURL,
        isOnline: true,
        profileComplete: true,
        email: user!.email || null,
        phoneNumber: user!.phoneNumber || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastSeen: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await refreshProfile();
    } catch (error: any) {
      console.error('Profile error:', error);
      Alert.alert('خطأ', 'حدث خطأ. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a35', '#0a0a1a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>أكمل ملفك الشخصي</Text>
        <Text style={styles.subtitle}>الخطوة {step} من 3</Text>

        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
          ))}
        </View>

        <View style={styles.card}>
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>المعلومات الأساسية</Text>
              {/* Avatar */}
              <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                    <Text style={styles.avatarText}>أضف صورة</Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Username */}
              <Text style={styles.label}>اسم المستخدم *</Text>
              <TextInput
                style={styles.input}
                placeholder="اسمك في التطبيق"
                placeholderTextColor={COLORS.textMuted}
                value={form.username}
                onChangeText={v => setForm(p => ({ ...p, username: v }))}
              />
              {/* Bio */}
              <Text style={styles.label}>نبذة عنك</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="اكتب شيئاً عن نفسك..."
                placeholderTextColor={COLORS.textMuted}
                value={form.bio}
                onChangeText={v => setForm(p => ({ ...p, bio: v }))}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity style={styles.nextBtn} onPress={() => {
                if (!form.username.trim()) return Alert.alert('خطأ', 'أدخل اسم المستخدم');
                if (!avatar) return Alert.alert('خطأ', 'أضف صورة شخصية');
                setStep(2);
              }}>
                <Text style={styles.nextBtnText}>التالي</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>المعلومات الشخصية</Text>
              {/* Age */}
              <Text style={styles.label}>العمر * (18+)</Text>
              <TextInput
                style={styles.input}
                placeholder="عمرك"
                placeholderTextColor={COLORS.textMuted}
                value={form.age}
                onChangeText={v => setForm(p => ({ ...p, age: v }))}
                keyboardType="number-pad"
                maxLength={3}
              />
              {/* Gender */}
              <Text style={styles.label}>الجنس *</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, form.gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setForm(p => ({ ...p, gender: 'male' }))}
                >
                  <Ionicons name="male" size={20} color={form.gender === 'male' ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.genderText, form.gender === 'male' && styles.genderTextActive]}>ذكر</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, form.gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setForm(p => ({ ...p, gender: 'female' }))}
                >
                  <Ionicons name="female" size={20} color={form.gender === 'female' ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.genderText, form.gender === 'female' && styles.genderTextActive]}>أنثى</Text>
                </TouchableOpacity>
              </View>
              {/* Country */}
              <Text style={styles.label}>البلد *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCountries(!showCountries)}
              >
                <Text style={{ color: form.country ? COLORS.textPrimary : COLORS.textMuted }}>
                  {form.country || 'اختر البلد'}
                </Text>
              </TouchableOpacity>
              {showCountries && (
                <View style={styles.dropdown}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {COUNTRIES.map(c => (
                      <TouchableOpacity
                        key={c.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setForm(p => ({ ...p, country: c.value }));
                          setShowCountries(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {/* City */}
              <Text style={styles.label}>المدينة *</Text>
              <TextInput
                style={styles.input}
                placeholder="مدينتك"
                placeholderTextColor={COLORS.textMuted}
                value={form.city}
                onChangeText={v => setForm(p => ({ ...p, city: v }))}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.backBtnText}>رجوع</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={() => {
                  if (!form.age || parseInt(form.age) < 18) return Alert.alert('خطأ', 'يجب أن يكون عمرك 18+');
                  if (!form.gender) return Alert.alert('خطأ', 'اختر الجنس');
                  if (!form.country) return Alert.alert('خطأ', 'اختر البلد');
                  if (!form.city.trim()) return Alert.alert('خطأ', 'أدخل المدينة');
                  setStep(3);
                }}>
                  <Text style={styles.nextBtnText}>التالي</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>الاهتمامات</Text>
              <Text style={styles.stepSubtitle}>اختر ما يهمك (اختياري)</Text>
              <View style={styles.interestsGrid}>
                {INTERESTS.map(interest => (
                  <TouchableOpacity
                    key={interest}
                    style={[styles.chip, form.interests.includes(interest) && styles.chipActive]}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text style={[styles.chipText, form.interests.includes(interest) && styles.chipTextActive]}>
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                  <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.backBtnText}>رجوع</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.nextBtnText}>إنهاء</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: SIZES.lg, paddingTop: 60 },
  title: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: SIZES.lg },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.primary },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusXl,
    padding: SIZES.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  stepTitle: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  stepSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.md },
  avatarPicker: { alignSelf: 'center', marginBottom: SIZES.lg },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.bgInput, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.textMuted, fontSize: SIZES.fontXs, marginTop: 4 },
  label: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 6, marginTop: SIZES.sm },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 4,
    justifyContent: 'center',
  },
  textarea: { height: 80, textAlignVertical: 'top', paddingTop: SIZES.sm },
  genderRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: 4 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  genderBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  genderTextActive: { color: '#fff', fontWeight: '600' },
  dropdown: {
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 4,
  },
  dropdownItem: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownText: { color: COLORS.textPrimary, fontSize: SIZES.fontSm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SIZES.lg },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md,
  },
  nextBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: SIZES.md, paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border,
  },
  backBtnText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  submitBtn: {
    flex: 1, backgroundColor: COLORS.success, borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
});
