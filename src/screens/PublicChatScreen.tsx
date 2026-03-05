import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { PublicMessage } from '../types';
import { getDisplayName, getAvatar } from '../lib/firebase';

const ROOMS = [
  { id: 'publicChat', label: 'الكل 🌍', emoji: '🌍' },
  { id: 'chat_rojava', label: 'Rojava 🌹', emoji: '🌹' },
  { id: 'chat_bashur', label: 'Başûr 🌿', emoji: '🌿' },
  { id: 'chat_rojhelat', label: 'Rojhelat 🌅', emoji: '🌅' },
  { id: 'chat_bakur', label: 'Bakûr ⭐', emoji: '⭐' },
];

export default function PublicChatScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [activeRoom, setActiveRoom] = useState('publicChat');
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<PublicMessage | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    const q = firestore()
      .collection(activeRoom)
      .orderBy('createdAt', 'asc')
      .limitToLast(50);

    const unsub = q.onSnapshot(snapshot => {
      const msgs: PublicMessage[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as PublicMessage);
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, () => setLoading(false));

    return () => unsub();
  }, [activeRoom]);

  const sendMessage = async () => {
    if (!text.trim() || !user || !userProfile) return;
    const msgText = text.trim();
    setText('');
    const currentReply = replyTo;
    setReplyTo(null);
    setSending(true);
    try {
      const msgData: any = {
        senderId: user.uid,
        senderName: getDisplayName(userProfile),
        senderAvatar: getAvatar(userProfile),
        senderIsOwner: userProfile.isOwner || false,
        content: msgText,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      if (currentReply) {
        msgData.replyTo = {
          id: currentReply.id,
          senderName: currentReply.senderName,
          content: currentReply.content || null,
        };
      }
      await firestore().collection(activeRoom).add(msgData);
      // حذف الرسائل القديمة تلقائياً (أكثر من 100)
      pruneOldMessages();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (!user || !userProfile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() || 'jpg';
      const storageRef = storage().ref(`public_chat/${activeRoom}/${Date.now()}.${ext}`);
      await storageRef.put(blob);
      const mediaUrl = await storageRef.getDownloadURL();
      await firestore().collection(activeRoom).add({
        senderId: user.uid,
        senderName: getDisplayName(userProfile),
        senderAvatar: getAvatar(userProfile),
        senderIsOwner: userProfile.isOwner || false,
        mediaUrl,
        mediaType: 'image',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      pruneOldMessages();
    } catch (err) {
      Alert.alert('خطأ', 'فشل إرسال الصورة');
    } finally {
      setSending(false);
    }
  };

  const pruneOldMessages = async () => {
    try {
      const snapshot = await firestore()
        .collection(activeRoom)
        .orderBy('createdAt', 'asc')
        .get();
      if (snapshot.size > 100) {
        const toDelete = snapshot.docs.slice(0, snapshot.size - 80);
        const batch = firestore().batch();
        toDelete.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch {}
  };

  const renderMessage = ({ item }: { item: PublicMessage }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <TouchableOpacity
        onLongPress={() => setReplyTo(item)}
        activeOpacity={0.9}
        style={[styles.msgRow, isMine && styles.msgRowMine]}
      >
        {!isMine && (
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: item.senderId })}
          >
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.msgAvatar} />
            ) : (
              <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                <Text style={styles.msgAvatarInitial}>{(item.senderName || '?').charAt(0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.msgBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {!isMine && (
            <Text style={styles.msgSenderName}>
              {item.senderName}
              {item.senderIsOwner ? ' 👑' : ''}
            </Text>
          )}
          {item.replyTo && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyName}>{item.replyTo.senderName}</Text>
              <Text style={styles.replyContent} numberOfLines={1}>
                {item.replyTo.content || '📷 صورة'}
              </Text>
            </View>
          )}
          {item.mediaUrl ? (
            <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />
          ) : (
            <Text style={[styles.msgText, isMine && styles.myMsgText]}>{item.content}</Text>
          )}
          <Text style={[styles.msgTime, isMine && styles.myMsgTime]}>
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الشات العام</Text>
      </View>

      {/* Room Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomsScroll}>
        <View style={styles.rooms}>
          {ROOMS.map(room => (
            <TouchableOpacity
              key={room.id}
              style={[styles.roomBtn, activeRoom === room.id && styles.roomBtnActive]}
              onPress={() => setActiveRoom(room.id)}
            >
              <Text style={[styles.roomText, activeRoom === room.id && styles.roomTextActive]}>
                {room.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={50} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>لا توجد رسائل. كن أول من يكتب!</Text>
              </View>
            }
          />
        )}

        {/* Reply Preview */}
        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarName}>{replyTo.senderName}</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {replyTo.content || '📷 صورة'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.imageBtn} onPress={sendImage} disabled={sending}>
            <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  roomsScroll: { maxHeight: 50, backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rooms: { flexDirection: 'row', paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, gap: SIZES.xs },
  roomBtn: {
    paddingHorizontal: SIZES.md, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  roomBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roomText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
  roomTextActive: { color: '#fff', fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msgList: { paddingHorizontal: SIZES.sm, paddingVertical: SIZES.sm, paddingBottom: 10 },
  msgRow: { flexDirection: 'row', marginBottom: SIZES.sm, alignItems: 'flex-end' },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 6, backgroundColor: COLORS.bgInput },
  msgAvatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  msgAvatarInitial: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  msgBubble: {
    maxWidth: '75%', borderRadius: SIZES.radiusMd, padding: SIZES.sm,
    borderWidth: 1,
  },
  myBubble: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary + '50' },
  theirBubble: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  msgSenderName: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  replyPreview: {
    backgroundColor: COLORS.bgInput, borderRadius: 6, padding: 6,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 4,
  },
  replyName: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600' },
  replyContent: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  msgImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },
  msgText: { color: COLORS.textPrimary, fontSize: SIZES.fontMd },
  myMsgText: { color: COLORS.textPrimary },
  msgTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2, textAlign: 'right' },
  myMsgTime: { textAlign: 'right' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md, textAlign: 'center' },
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600' },
  replyBarText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : SIZES.xs,
  },
  imageBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd,
    borderWidth: 1, borderColor: COLORS.border, maxHeight: 100,
    marginHorizontal: SIZES.xs,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
});
