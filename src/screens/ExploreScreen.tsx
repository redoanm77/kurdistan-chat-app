import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { UserProfile } from '../types';
import { COLLECTIONS } from '../lib/firebase';

export default function ExploreScreen({ navigation }: any) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    firestore()
      .collection(COLLECTIONS.USERS)
      .where('profileComplete', '==', true)
      .where('isBlocked', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get()
      .then(snapshot => {
        const data = snapshot.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== user?.uid);
        setUsers(data);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
    >
      <Image source={{ uri: item.photoURL || '' }} style={styles.photo} />
      <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? COLORS.online : COLORS.offline }]} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.meta}>{item.age} · {item.city}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>استكشاف</Text>
      </View>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={item => item.uid}
        numColumns={2}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
  grid: { padding: SIZES.sm },
  card: {
    flex: 1, margin: SIZES.xs, borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.bgCard, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.bgInput },
  onlineDot: {
    position: 'absolute', top: 8, right: 8,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.bgCard,
  },
  info: { padding: SIZES.sm },
  name: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textPrimary },
  meta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
});
