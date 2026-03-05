import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { Message } from '../types';
import { COLLECTIONS } from '../lib/firebase';

export default function ChatScreen({ route, navigation }: any) {
  const { userId, userName, userPhoto } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const chatId = [user!.uid, userId].sort().join('_');

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    const unsubscribe = firestore()
      .collection(COLLECTIONS.MESSAGES)
      .where('chatId', '==', chatId)
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');

    await firestore().collection(COLLECTIONS.MESSAGES).add({
      chatId,
      senderId: user!.uid,
      receiverId: userId,
      text: msgText,
      type: 'text',
      timestamp: Date.now(),
      read: false,
    });

    // Update chat metadata
    await firestore().collection(COLLECTIONS.CHATS).doc(chatId).set({
      participants: [user!.uid, userId],
      lastMessage: msgText,
      lastMessageTime: Date.now(),
    }, { merge: true });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user!.uid;
    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.text}</Text>
          <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => navigation.navigate('UserProfile', { userId })}
        >
          <Image source={{ uri: userPhoto }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{userName}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ابدأ المحادثة الآن 👋</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="اكتب رسالة..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingTop: 50, paddingBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: SIZES.sm,
  },
  backBtn: { padding: 4 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgInput },
  headerName: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: SIZES.md, paddingBottom: SIZES.lg },

  messageRow: { flexDirection: 'row', marginBottom: SIZES.xs },
  messageRowMine: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%', borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
  },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: COLORS.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  messageText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontMd },

  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: SIZES.sm,
  },
  textInput: {
    flex: 1, backgroundColor: COLORS.bgInput,
    borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: SIZES.fontMd, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
