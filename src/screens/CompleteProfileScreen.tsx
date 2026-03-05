import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { COLORS, SIZES } from '../constants/theme';
import { COLLECTIONS } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

// Kurdish regions and countries data
const KURDISH_REGIONS = [
  { label: 'روژئافا — Rojava', value: 'rojava' },
  { label: 'باشووری كوردستان — South Kurdistan', value: 'south_kurdistan' },
  { label: 'باكووری كوردستان — North Kurdistan', value: 'north_kurdistan' },
  { label: 'ڕۆژهەڵاتی كوردستان — East Kurdistan', value: 'east_kurdistan' },
];

const COUNTRIES = [
  ...KURDISH_REGIONS,
  { label: 'سوریا — Syria', value: 'syria' },
  { label: 'عراق — Iraq', value: 'iraq' },
  { label: 'تركيا — Turkey', value: 'turkey' },
  { label: 'إيران — Iran', value: 'iran' },
  { label: 'ألمانيا — Germany', value: 'germany' },
  { label: 'السويد — Sweden', value: 'sweden' },
  { label: 'هولندا — Netherlands', value: 'netherlands' },
  { label: 'النمسا — Austria', value: 'austria' },
  { label: 'بلجيكا — Belgium', value: 'belgium' },
  { label: 'فرنسا — France', value: 'france' },
  { label: 'المملكة المتحدة — UK', value: 'uk' },
  { label: 'الدنمارك — Denmark', value: 'denmark' },
  { label: 'النرويج — Norway', value: 'norway' },
  { label: 'فنلندا — Finland', value: 'finland' },
  { label: 'سويسرا — Switzerland', value: 'switzerland' },
  { label: 'كندا — Canada', value: 'canada' },
  { label: 'أمريكا — USA', value: 'usa' },
  { label: 'أستراليا — Australia', value: 'australia' },
];

const CITIES_BY_COUNTRY: { [key: string]: string[] } = {
  rojava: ['Qamishli', 'Kobani', 'Afrin', 'Derik', 'Serêkaniyê', 'Tirbespiyê', 'Dirbêsiyê', 'Amûdê', 'Girê Spî'],
  south_kurdistan: ['Hewlêr / Erbil', 'Silêmanî', 'Duhok', 'Kerkuk', 'Halabja', 'Zakho', 'Akre', 'Ranya'],
  north_kurdistan: ['Amed / Diyarbakır', 'Mêrdîn', 'Riha / Urfa', 'Wan / Van', 'Cizîr', 'Nusaybin', 'Siirt'],
  east_kurdistan: ['Mahabad', 'Sine / Sanandaj', 'Kirmaşan', 'Urmiye', 'Bukan', 'Piranshahr'],
  syria: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Deir ez-Zor'],
  iraq: ['Baghdad', 'Basra', 'Mosul', 'Najaf', 'Karbala'],
  turkey: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'],
  iran: ['Tehran', 'Isfahan', 'Shiraz', 'Tabriz', 'Mashhad'],
  germany: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf'],
  sweden: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås'],
  netherlands: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  austria: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'],
  belgium: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège'],
  france: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  uk: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow'],
  denmark: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg'],
  norway: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim'],
  finland: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa'],
  switzerland: ['Zurich', 'Geneva', 'Basel', 'Bern'],
  canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  usa: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
  australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
};

const INTERESTS = [
  'Muzik', 'Werzish', 'Geryan', 'Xwarinpêjtin', 'Xwendin',
  'Wênekêşan', 'Xêzkirin', 'Lîstik', 'Sînema', 'Teknolojî',
  'Xweza', 'Huner', 'Helbest', 'Dîrok', 'Ziman', 'Pêşveçûna Xwe',
];

export default function CompleteProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [livingIn, setLivingIn] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'نحتاج إذن الوصول إلى الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'نحتاج إذن الموقع');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        setLivingIn(`${address.city || address.district || ''}, ${address.country || ''}`);
      }
    } catch {
      Alert.alert('خطأ', 'فشل الحصول على الموقع');
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    const uid = user!.uid;
    const ref = storage().ref(`avatars/${uid}.jpg`);
    await ref.putFile(uri);
    return await ref.getDownloadURL();
  };

  const handleSubmit = async () => {
    if (!photoUri) { Alert.alert('مطلوب', 'الصورة الشخصية إلزامية'); return; }
    if (!displayName.trim()) { Alert.alert('مطلوب', 'الاسم الكامل إلزامي'); return; }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18) { Alert.alert('خطأ', 'يجب أن يكون عمرك 18 سنة أو أكثر'); return; }
    if (!gender) { Alert.alert('مطلوب', 'الجنس إلزامي'); return; }
    if (!country) { Alert.alert('مطلوب', 'الدولة إلزامية'); return; }
    if (!city) { Alert.alert('مطلوب', 'المدينة إلزامية'); return; }

    try {
      setLoading(true);
      const photoURL = await uploadPhoto(photoUri);
      const countryLabel = COUNTRIES.find(c => c.value === country)?.label || country;

      await firestore().collection(COLLECTIONS.USERS).doc(user!.uid).set({
        uid: user!.uid,
        displayName: displayName.trim(),
        photoURL,
        bio: bio.trim(),
        age: ageNum,
        gender,
        country: countryLabel,
        city,
        livingIn: livingIn.trim(),
        instagram: instagram.trim(),
        interests: selectedInterests,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        profileComplete: true,
        role: 'user',
        isBlocked: false,
        phoneNumber: user!.phoneNumber || null,
        email: user!.email || null,
      });

      await auth().currentUser?.updateProfile({ displayName: displayName.trim(), photoURL });
      await refreshProfile();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ البيانات. حاول مرة أخرى.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const availableCities = country ? (CITIES_BY_COUNTRY[country] || []) : [];
  const filteredCities = availableCities.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <LinearGradient colors={['#0a0a1a', '#12122a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>أكمل ملفك الشخصي</Text>
        <Text style={styles.subtitle}>هذه المعلومات ستظهر للأعضاء الآخرين</Text>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={36} color={COLORS.primary} />
              <Text style={styles.photoText}>أضف صورة شخصية *</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="pencil" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>الاسم الكامل *</Text>
          <TextInput
            style={styles.input}
            placeholder="اكتب اسمك الكامل"
            placeholderTextColor={COLORS.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.label}>نبذة عنك</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب نبذة قصيرة عنك..."
            placeholderTextColor={COLORS.textMuted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Age & Gender */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SIZES.sm }]}>
            <Text style={styles.label}>العمر *</Text>
            <TextInput
              style={styles.input}
              placeholder="18+"
              placeholderTextColor={COLORS.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <View style={[styles.field, { flex: 1.5 }]}>
            <Text style={styles.label}>الجنس *</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                onPress={() => setGender('male')}
              >
                <Ionicons name="male" size={18} color={gender === 'male' ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>ذكر</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
                onPress={() => setGender('female')}
              >
                <Ionicons name="female" size={18} color={gender === 'female' ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>أنثى</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Country */}
        <View style={styles.field}>
          <Text style={styles.label}>الدولة / المنطقة *</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCountryPicker(true)}>
            <Text style={country ? styles.selectText : styles.selectPlaceholder}>
              {country ? COUNTRIES.find(c => c.value === country)?.label : 'اختر الدولة...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Country Picker Modal */}
        {showCountryPicker && (
          <View style={styles.pickerContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث..."
              placeholderTextColor={COLORS.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {filteredCountries.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.pickerItem, country === c.value && styles.pickerItemActive]}
                  onPress={() => { setCountry(c.value); setCity(''); setShowCountryPicker(false); setCountrySearch(''); }}
                >
                  <Text style={[styles.pickerItemText, country === c.value && styles.pickerItemTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* City */}
        <View style={styles.field}>
          <Text style={styles.label}>المدينة *</Text>
          <TouchableOpacity
            style={[styles.selectBtn, !country && styles.selectBtnDisabled]}
            onPress={() => country && setShowCityPicker(true)}
          >
            <Text style={city ? styles.selectText : styles.selectPlaceholder}>
              {city || (country ? 'اختر المدينة...' : 'اختر الدولة أولاً')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* City Picker */}
        {showCityPicker && (
          <View style={styles.pickerContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن مدينة..."
              placeholderTextColor={COLORS.textMuted}
              value={citySearch}
              onChangeText={setCitySearch}
              autoFocus
            />
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {filteredCities.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerItem, city === c && styles.pickerItemActive]}
                  onPress={() => { setCity(c); setShowCityPicker(false); setCitySearch(''); }}
                >
                  <Text style={[styles.pickerItemText, city === c && styles.pickerItemTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Living In */}
        <View style={styles.field}>
          <Text style={styles.label}>أين تعيش الآن؟</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="المدينة، الدولة"
              placeholderTextColor={COLORS.textMuted}
              value={livingIn}
              onChangeText={setLivingIn}
            />
            <TouchableOpacity style={styles.gpsBtn} onPress={getLocation}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.gpsFullBtn} onPress={getLocation}>
            <Ionicons name="navigate" size={16} color={COLORS.primary} />
            <Text style={styles.gpsFullText}>استخدم موقعي الحالي</Text>
          </TouchableOpacity>
        </View>

        {/* Instagram */}
        <View style={styles.field}>
          <Text style={styles.label}>Instagram</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-instagram" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconField]}
              placeholder="اسم المستخدم"
              placeholderTextColor={COLORS.textMuted}
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Interests */}
        <View style={styles.field}>
          <Text style={styles.label}>الاهتمامات</Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map(interest => (
              <TouchableOpacity
                key={interest}
                style={[styles.interestChip, selectedInterests.includes(interest) && styles.interestChipActive]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[styles.interestText, selectedInterests.includes(interest) && styles.interestTextActive]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>حفظ وإكمال الملف الشخصي</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SIZES.lg },
  title: { fontSize: SIZES.fontXxl, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginTop: SIZES.xl },
  subtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SIZES.xl },

  photoContainer: { alignSelf: 'center', marginBottom: SIZES.xl, position: 'relative' },
  photo: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: COLORS.primary },
  photoPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.primary,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  photoText: { fontSize: SIZES.fontXs, color: COLORS.primary, marginTop: 4, textAlign: 'center' },
  photoEditBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },

  field: { marginBottom: SIZES.md },
  label: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.xs, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row', marginBottom: 0 },
  genderRow: { flexDirection: 'row', gap: SIZES.xs },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  genderBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  genderBtnActiveFemale: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  genderText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm, fontWeight: '500' },
  genderTextActive: { color: '#fff' },

  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectBtnDisabled: { opacity: 0.5 },
  selectText: { color: COLORS.textPrimary, fontSize: SIZES.fontMd },
  selectPlaceholder: { color: COLORS.textMuted, fontSize: SIZES.fontMd },

  pickerContainer: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.md, overflow: 'hidden',
  },
  searchInput: {
    backgroundColor: COLORS.bgInput, paddingHorizontal: SIZES.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerList: { maxHeight: 200 },
  pickerItem: { paddingHorizontal: SIZES.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemActive: { backgroundColor: COLORS.primary + '30' },
  pickerItemText: { color: COLORS.textPrimary, fontSize: SIZES.fontSm },
  pickerItemTextActive: { color: COLORS.primary, fontWeight: '600' },

  inputRow: { flexDirection: 'row', gap: SIZES.xs },
  gpsBtn: {
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  gpsFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    justifyContent: 'center', paddingVertical: SIZES.sm,
    backgroundColor: COLORS.primary + '20', borderRadius: SIZES.radiusMd, marginTop: SIZES.xs,
  },
  gpsFullText: { color: COLORS.primary, fontSize: SIZES.fontSm },

  inputWithIcon: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: SIZES.md, zIndex: 1 },
  inputWithIconField: { flex: 1, paddingLeft: 44 },

  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  interestChip: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  interestChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  interestText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  interestTextActive: { color: '#fff', fontWeight: '500' },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md, alignItems: 'center', marginTop: SIZES.lg,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '700' },
});
