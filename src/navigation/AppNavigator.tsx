import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';
import { RootStackParamList, MainTabParamList } from '../types';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import * as Notifications from 'expo-notifications';

// Screens
import AuthScreen from '../screens/AuthScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import PublicChatScreen from '../screens/PublicChatScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import MoreScreen from '../screens/MoreScreen';

// إعداد الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'PublicChat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'More') iconName = focused ? 'grid' : 'grid-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الأعضاء' }} />
      <Tab.Screen name="PublicChat" component={PublicChatScreen} options={{ title: 'الشات العام' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'الرسائل' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'ملفي' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'المزيد' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, profileComplete } = useAuth();

  // إعداد FCM للإشعارات الخارجية
  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (enabled) {
          const token = await messaging().getToken();
          if (token) {
            await firestore().collection('fcmTokens').doc(user.uid).set({
              uid: user.uid, token, platform: 'android',
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            await firestore().collection('users').doc(user.uid).update({ fcmToken: token }).catch(() => {});
          }
        }
      } catch {}
    };
    setupNotifications();

    // استقبال الإشعارات في المقدمة
    const unsubForeground = messaging().onMessage(async remoteMessage => {
      const { notification } = remoteMessage;
      if (notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title || 'Kurdistan Chat',
            body: notification.body || '',
            sound: true,
          },
          trigger: null,
        });
      }
    });

    // تحديث token عند التغيير
    const unsubTokenRefresh = messaging().onTokenRefresh(async token => {
      await firestore().collection('fcmTokens').doc(user.uid).set({
        uid: user.uid, token, platform: 'android',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    });

    return () => {
      unsubForeground();
      unsubTokenRefresh();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !profileComplete ? (
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen name="ContactUs" component={ContactUsScreen} />
            <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
});
