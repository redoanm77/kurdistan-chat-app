import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { getDisplayName, getAvatar } from '../lib/firebase';

const INTERESTS = [
  'Muzik', 'Werzish', 'Geryan', 'Xwarinpêjtin', 'Xwendin',
  'Wênekêşan', 'Xêzkirin', 'Lîstik', 'Sînema', 'Teknolojî',
  'Xweza', 'Huner', 'Helbest', 'Dîrok', 'Ziman', 'Pêşveçûna Xwe',
];

export default function EditProfileScreen({ navigation }: any) {
  const { user, userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: getDisplayName(userProfile),
    bio: userProfile?.bio || '',
    city: userProfile?.city || '',
    livingIn: userProfile?.livingIn || '',
    instagram: userProfile?.instagram || '',
    interests: userProfile?.interests || [] as string[],
  });
  const [newAvatar, setNewAvatar] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewAvatar(result.assets[0].uri);
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

  const handleSave = async () => {
    if (!form.username.trim()) return Alert.alert('خطأ', 'أدخل اسم المستخدم');
    setLoading(true);
    try {
      let photoURL = userProfile?.photoURL || userProfile?.avatarUrl || '';
      if (newAvatar) {
        const response = await fetch(newAvatar);
        const blob = await response.blob();
        const ext = newAvatar.split('.').pop() || 'jpg';
        const storageRef = storage().ref(`avatars/${user!.uid}.${ext}`);
        await storageRef.put(blob);
        photoURL = await storageRef.getDownloadURL();
      }
      await firestore().collection('users').doc(user!.uid).update({
        username: form.username.trim(),
        displayName: form.username.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        livingIn: form.livingIn.trim(),
        instagram: form.instagram.trim(),
        interests: form.interests,
        ...(photoURL && { photoURL, avatarUrl: photoURL }),
      });
      await refreshProfile();
      Alert.alert('تم', 'تم تحديث الملف الشخصي بنجاح', [
        { text: 'حسناً', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatar = newAvatar || getAvatar(userProfile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtn}>حفظ</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
        {currentAvatar ? (
          <Image source={{ uri: currentAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{getDisplayName(userProfile).charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cameraOverlay}>
          <Ionicons name="camera" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.label}>اسم المستخدم *</Text>
        <TextInput
          style={styles.input}
          value={form.username}
          onChangeText={v => setForm(p => ({ ...p, username: v }))}
          placeholder="اسمك في التطبيق"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>نبذة عنك</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={form.bio}
          onChangeText={v => setForm(p => ({ ...p, bio: v }))}
          placeholder="اكتب شيئاً عن نفسك..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>المدينة</Text>
        <TextInput
          style={styles.input}
          value={form.city}
          onChangeText={v => setForm(p => ({ ...p, city: v }))}
          placeholder="مدينتك"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>يعيش في</Text>
        <TextInput
          style={styles.input}
          value={form.livingIn}
          onChangeText={v => setForm(p => ({ ...p, livingIn: v }))}
          placeholder="مكان إقامتك الحالي"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Instagram</Text>
        <TextInput
          style={styles.input}
          value={form.instagram}
          onChangeText={v => setForm(p => ({ ...p, instagram: v }))}
          placeholder="اسم المستخدم بدون @"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>الاهتمامات</Text>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.textPrimary },
  saveBtn: { color: COLORS.primary, fontSize: SIZES.fontMd, fontWeight: '600' },
  avatarContainer: { alignSelf: 'center', marginVertical: SIZES.xl, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.bg,
  },
  form: { paddingHorizontal: SIZES.lg },
  label: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: 6, marginTop: SIZES.md },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textarea: { height: 80, textAlignVertical: 'top', paddingTop: SIZES.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SIZES.lg },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
