export interface UserProfile {
  uid: string;
  displayName?: string;
  username?: string;
  photoURL?: string | null;
  avatarUrl?: string | null;
  bio?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  country?: string;
  city?: string;
  livingIn?: string;
  instagram?: string;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: any;
  createdAt?: any;
  fcmToken?: string;
  role?: 'admin' | 'user';
  isBlocked?: boolean;
  isBanned?: boolean;
  isAdmin?: boolean;
  isOwner?: boolean;
  isVerified?: boolean;
  profileComplete?: boolean;
  phoneNumber?: string;
  email?: string;
  emailVerified?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface PublicMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderIsOwner?: boolean;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  createdAt: any;
  replyTo?: {
    id: string;
    senderName: string;
    content?: string;
    mediaUrl?: string;
  };
  reactions?: Record<string, string>;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  createdAt: any;
  read?: boolean;
  reactions?: Record<string, string>;
  replyTo?: {
    id: string;
    senderName: string;
    content?: string;
    mediaUrl?: string;
  };
  isDeleted?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCounts?: Record<string, number>;
  otherUser?: UserProfile;
}

export interface Story {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  imageUrl?: string;
  mediaUrl?: string;
  caption?: string;
  createdAt: any;
  expiresAt?: any;
  views?: string[];
  friendsOnly?: boolean;
}

export interface AppNotification {
  id: string;
  recipientUid: string;
  senderUid?: string;
  type: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  Main: undefined;
  Chat: { conversationId: string; otherUserId: string; userName: string; userPhoto: string };
  UserProfile: { userId: string };
  PublicChatScreen: undefined;
  EditProfile: undefined;
  Settings: undefined;
  MessagesScreen: undefined;
  StoriesScreen: undefined;
  AboutUs: undefined;
  ContactUs: undefined;
  AdminPanel: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  PublicChat: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
  More: undefined;
};
