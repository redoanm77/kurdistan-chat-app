import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

// Firebase is auto-initialized via google-services.json
export { firebase, auth, firestore, storage, messaging };

// Firestore collections - نفس الموقع
export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  STORIES: 'stories',
  FRIEND_STORIES: 'friendStories',
  NOTIFICATIONS: 'notifications',
  FRIEND_REQUESTS: 'friendRequests',
  REPORTS: 'reports',
  BLOCKS: 'blocks',
  BANNED_WORDS: 'bannedWords',
  RATINGS: 'ratings',
  PHOTO_LIKES: 'photoLikes',
  PROFILE_VISITS: 'profileVisits',
  // Public chat rooms
  PUBLIC_CHAT: 'publicChat',
  CHAT_ROJAVA: 'chat_rojava',
  CHAT_BASHUR: 'chat_bashur',
  CHAT_ROJHELAT: 'chat_rojhelat',
  CHAT_BAKUR: 'chat_bakur',
};

// Helper to get display name
export const getDisplayName = (profile: any): string => {
  return profile?.username || profile?.displayName || 'مستخدم';
};

// Helper to get avatar
export const getAvatar = (profile: any): string | null => {
  return profile?.avatarUrl || profile?.photoURL || null;
};
