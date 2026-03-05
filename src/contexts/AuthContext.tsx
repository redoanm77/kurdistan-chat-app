import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileComplete: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get();
      if (doc.exists) {
        const data = doc.data() as UserProfile;
        setUserProfile({ ...data, uid });
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
        await firestore().collection('users').doc(firebaseUser.uid).update({
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (user) {
      await firestore().collection('users').doc(user.uid).update({
        isOnline: false,
        lastSeen: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
    await auth().signOut();
  };

  const profileComplete = !!(
    userProfile &&
    userProfile.profileComplete === true &&
    (userProfile.displayName || userProfile.username) &&
    (userProfile.photoURL || userProfile.avatarUrl) &&
    userProfile.age &&
    userProfile.age >= 18 &&
    userProfile.gender &&
    userProfile.country &&
    userProfile.city
  );

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileComplete, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
