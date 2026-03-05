import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { PrivateMessage } from '../types';

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, otherUserId, userName, userPhoto } = route.params;
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<PrivateMessage | null>(null);
  const [otherIsOnline, setOtherIsOnline] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Voice recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<any>(null);

  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!otherUserId) return;
    const unsub = firestore().collection('users').doc(otherUserId).onSnapshot(doc => {
      if (doc.exists) setOtherIsOnline(doc.data()?.isOnline || false);
    });
    return () => unsub();
  }, [otherUserId]);

  useEffect(() => {
    if (!user || !conversationId) return;
    firestore().collection('conversations').doc(conversationId).update({
      [`unreadCounts.${user.uid}`]: 0,
    }).catch(() => {});
  }, [user, conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const q = firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(100);
    const unsub = q.onSnapshot(snapshot => {
      const msgs: PrivateMessage[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as PrivateMessage);
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      // تحديد الرسائل كمقروءة
      if (user) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.senderId !== user.uid && !data.readBy?.includes(user.uid)) {
            doc.ref.update({ readBy: firestore.FieldValue.arrayUnion(user.uid), read: true }).catch(() => {});
          }
        });
      }
    }, () => setLoading(false));
    return () => unsub();
  }, [conversationId, user]);

  const updateConversation = async (lastMsg: string) => {
    if (!conversationId || !user) return;
    try {
      const convRef = firestore().collection('conversations').doc(conversationId);
      const convDoc = await convRef.get();
      const currentUnread = convDoc.data()?.unreadCounts?.[otherUserId] ?? 0;
      await convRef.update({
        lastMessage: lastMsg,
        lastMessageAt: firestore.FieldValue.serverTimestamp(),
        [`unreadCounts.${otherUserId}`]: currentUnread + 1,
      });
    } catch {}
  };

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
        content: msgText,
        createdAt: firestore.FieldValue.serverTimestamp(),
        read: false,
        readBy: [user.uid],
      };
      if (currentReply) {
        msgData.replyTo = {
          id: currentReply.id,
          senderName: currentReply.senderId === user.uid ? (userProfile.username || userProfile.displayName || 'أنت') : userName,
          content: currentReply.content || null,
        };
      }
      await firestore().collection('conversations').doc(conversationId).collection('messages').add(msgData);
      await updateConversation(msgText);
    } catch {}
    setSending(false);
  };

  const sendImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const path = `chat-images/${user?.uid}-${Date.now()}.${ext}`;
      const ref = storage().ref(path);
      await ref.putFile(asset.uri);
      const url = await ref.getDownloadURL();
      await firestore().collection('conversations').doc(conversationId).collection('messages').add({
        senderId: user?.uid, mediaUrl: url, mediaType: 'image',
        createdAt: firestore.FieldValue.serverTimestamp(), read: false, readBy: [user?.uid],
      });
      await updateConversation('📷 صورة');
    } catch { Alert.alert('خطأ', 'فشل إرسال الصورة'); }
    setSending(false);
  };

  // تسجيل الصوت
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('تنبيه', 'يجب السماح بالوصول للميكروفون'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch { Alert.alert('خطأ', 'فشل بدء التسجيل'); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(recordingTimer.current);
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;
      setSending(true);
      const path = `audio-messages/${user?.uid}-${Date.now()}.m4a`;
      const ref = storage().ref(path);
      await ref.putFile(uri);
      const url = await ref.getDownloadURL();
      await firestore().collection('conversations').doc(conversationId).collection('messages').add({
        senderId: user?.uid, audioUrl: url, audioDuration: recordingDuration,
        mediaType: 'audio', createdAt: firestore.FieldValue.serverTimestamp(), read: false, readBy: [user?.uid],
      });
      await updateConversation('🎤 رسالة صوتية');
    } catch { Alert.alert('خطأ', 'فشل إرسال الرسالة الصوتية'); }
    setSending(false);
    setRecordingDuration(0);
  };

  const cancelRecording = async () => {
    if (!recording) return;
    clearInterval(recordingTimer.current);
    setIsRecording(false);
    setRecordingDuration(0);
    try { await recording.stopAndUnloadAsync(); } catch {}
    setRecording(null);
  };

  // تشغيل الصوت
  const playAudio = async (msgId: string, audioUrl: string) => {
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      if (playingId === msgId) { setPlayingId(null); return; }
      setPlayingId(msgId);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if ((status as any).didJustFinish) { setPlayingId(null); sound.unloadAsync(); }
      });
    } catch { setPlayingId(null); }
  };

  // إرسال الموقع
  const sendLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('تنبيه', 'يجب السماح بالوصول للموقع'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      setSending(true);
      await firestore().collection('conversations').doc(conversationId).collection('messages').add({
        senderId: user?.uid, type: 'location', latitude, longitude, mapUrl,
        createdAt: firestore.FieldValue.serverTimestamp(), read: false, readBy: [user?.uid],
      });
      await updateConversation('📍 موقع');
    } catch { Alert.alert('خطأ', 'فشل إرسال الموقع'); }
    setSending(false);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const renderMessage = ({ item }: { item: PrivateMessage }) => {
    const isMe = item.senderId === user?.uid;
    const isRead = (item as any).readBy?.includes(otherUserId) || item.read;
    const time = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <TouchableOpacity
        style={[styles.msgRow, isMe && styles.msgRowMine]}
        onLongPress={() => setReplyTo(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.replyTo && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyName}>{item.replyTo.senderName}</Text>
              <Text style={styles.replyContent} numberOfLines={1}>{item.replyTo.content || '📷 صورة'}</Text>
            </View>
          )}
          {/* صورة */}
          {item.mediaUrl && item.mediaType === 'image' && (
            <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />
          )}
          {/* صوت */}
          {(item as any).audioUrl && (
            <TouchableOpacity style={styles.audioMsg} onPress={() => playAudio(item.id, (item as any).audioUrl)}>
              <Ionicons name={playingId === item.id ? 'pause-circle' : 'play-circle'} size={32} color={isMe ? '#fff' : COLORS.primary} />
              <View style={styles.audioInfo}>
                <View style={styles.audioWave}>
                  {[...Array(12)].map((_, i) => (
                    <View key={i} style={[styles.audioBar, { height: 4 + Math.random() * 16 }, isMe && styles.audioBarMe]} />
                  ))}
                </View>
                <Text style={[styles.audioDuration, isMe && { color: '#ffffffaa' }]}>
                  {formatDuration((item as any).audioDuration || 0)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* موقع */}
          {(item as any).type === 'location' && (
            <TouchableOpacity style={styles.locationMsg} onPress={() => Linking.openURL((item as any).mapUrl || `https://www.google.com/maps?q=${(item as any).latitude},${(item as any).longitude}`)}>
              <Ionicons name="location" size={24} color={COLORS.primary} />
              <Text style={styles.locationText}>📍 اضغط لفتح الموقع</Text>
            </TouchableOpacity>
          )}
          {/* نص */}
          {item.content ? <Text style={[styles.msgText, isMe && styles.myMsgText]}>{item.content}</Text> : null}
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>{time}</Text>
            {isMe && (
              <Ionicons
                name={isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={isRead ? COLORS.info : COLORS.textMuted}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser} onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarInitial}>{userName?.charAt(0) || '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{userName}</Text>
            <Text style={[styles.headerStatus, { color: otherIsOnline ? COLORS.online : COLORS.textMuted }]}>
              {otherIsOnline ? '🟢 متصل الآن' : 'غير متصل'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
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
                <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>ابدأ المحادثة</Text>
              </View>
            }
          />
        )}

        {/* Reply Bar */}
        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarName}>
                {replyTo.senderId === user?.uid ? 'أنت' : userName}
              </Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {replyTo.content || '📷 صورة'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recording Bar */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordBtn}>
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            </TouchableOpacity>
            <View style={styles.recordingInfo}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>جاري التسجيل... {formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.stopRecordBtn}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        {!isRecording && (
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={sendImage} disabled={sending}>
              <Ionicons name="image-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={sendLocation} disabled={sending}>
              <Ionicons name="location-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="اكتب رسالة..."
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            {text.trim() ? (
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={sending}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn} onPressIn={startRecording} disabled={sending}>
                <Ionicons name="mic-outline" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: SIZES.sm, padding: 4 },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgInput },
  headerAvatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '40' },
  headerAvatarInitial: { fontSize: SIZES.fontLg, fontWeight: 'bold', color: COLORS.primary },
  headerName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  headerStatus: { fontSize: SIZES.fontXs },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msgList: { paddingHorizontal: SIZES.sm, paddingVertical: SIZES.sm, paddingBottom: 10 },
  msgRow: { flexDirection: 'row', marginBottom: SIZES.sm },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '78%', borderRadius: SIZES.radiusMd, padding: SIZES.sm, borderWidth: 1 },
  myBubble: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary + '50' },
  theirBubble: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  replyPreview: { backgroundColor: COLORS.bgInput, borderRadius: 6, padding: 6, borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 4 },
  replyName: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600' },
  replyContent: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  msgImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },
  msgText: { color: COLORS.textPrimary, fontSize: SIZES.fontMd },
  myMsgText: { color: COLORS.textPrimary },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  msgTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  myMsgTime: {},
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, marginTop: SIZES.md },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600' },
  replyBarText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  // Audio
  audioMsg: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, minWidth: 160, paddingVertical: 4 },
  audioInfo: { flex: 1 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  audioBar: { width: 3, backgroundColor: COLORS.primary + '80', borderRadius: 2 },
  audioBarMe: { backgroundColor: '#ffffff80' },
  audioDuration: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  // Location
  locationMsg: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: 4 },
  locationText: { color: COLORS.primary, fontSize: SIZES.fontSm, fontWeight: '500' },
  // Recording
  recordingBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : SIZES.sm },
  cancelRecordBtn: { padding: 8 },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error },
  recordingText: { color: COLORS.textPrimary, fontSize: SIZES.fontSm },
  stopRecordBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  // Input
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.xs, paddingVertical: SIZES.xs, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : SIZES.xs },
  iconBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, color: COLORS.textPrimary, fontSize: SIZES.fontMd, borderWidth: 1, borderColor: COLORS.border, maxHeight: 100, marginHorizontal: SIZES.xs },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgInput, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
});
