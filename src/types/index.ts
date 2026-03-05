export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  city: string;
  livingIn?: string;
  instagram?: string;
  interests?: string[];
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
  fcmToken?: string;
  role?: 'admin' | 'user';
  isBlocked?: boolean;
  profileComplete: boolean;
  phoneNumber?: string;
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  type: 'text' | 'image' | 'audio';
  timestamp: number;
  read: boolean;
  chatId: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: { [uid: string]: number };
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: number;
  expiresAt: number;
  views: string[];
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  Main: undefined;
  Chat: { userId: string; userName: string; userPhoto: string };
  UserProfile: { userId: string };
  StoryViewer: { stories: Story[]; initialIndex: number };
  Settings: undefined;
  EditProfile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Stories: undefined;
  Notifications: undefined;
  Profile: undefined;
};
