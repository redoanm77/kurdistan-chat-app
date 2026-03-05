import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

// Firebase is auto-initialized via google-services.json
export { firebase, auth, firestore, storage, messaging };

// Firestore collections
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CHATS: 'chats',
  STORIES: 'stories',
  NOTIFICATIONS: 'notifications',
  FRIEND_REQUESTS: 'friendRequests',
  REPORTS: 'reports',
};
