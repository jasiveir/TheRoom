import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  confirmPasswordReset
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, AccountStatus } from '../types';
import { generateUniqueFriendCode } from '../lib/friendCode';
import { sanitizePhotoURL } from '../lib/imageUtils';

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (data: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    dateOfBirth?: string;
    country?: string;
    city?: string;
    phoneNumber?: string;
    photoURL?: string;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (asAdmin?: boolean) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  changePasswordWithOldPassword: (oldPassword: string, newPassword: string) => Promise<void>;
  confirmPasswordResetWithCode: (oobCode: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isMainAdmin: boolean;
  isModerator: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const PREDEFINED_ADMIN_EMAIL = 'admin@privatechat.com';

export const isGoogleEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  if (clean === PREDEFINED_ADMIN_EMAIL.toLowerCase()) return true;
  return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
};

const STORAGE_KEY = 'privatechat_session_uid';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const activeUnsubscribeProfileRef = React.useRef<(() => void) | null>(null);

  // Helper to clean up predefined admin doc if needed
  const cleanDuplicateAdminDocs = async () => {
    try {
      const canonicalAdminUid = 'admin_predefined';
      const adminQ = query(collection(db, 'users'), where('email', '==', PREDEFINED_ADMIN_EMAIL.toLowerCase()));
      const adminSnap = await getDocs(adminQ);
      for (const userDoc of adminSnap.docs) {
        if (userDoc.id === canonicalAdminUid) continue;
        console.log(`Cleaning up duplicate admin doc: ${userDoc.id}`);
        await deleteDoc(doc(db, 'users', userDoc.id)).catch(() => {});
        await deleteDoc(doc(db, 'admins', userDoc.id)).catch(() => {});
      }
    } catch (err) {
      console.warn('Notice during duplicate admin cleanup:', err);
    }
  };

  // Auto-seed main admin profile on startup
  useEffect(() => {
    const seedAdmin = async () => {
      try {
        const adminUid = 'admin_predefined';
        const adminRef = doc(db, 'users', adminUid);

        const adminProfile: UserProfile = {
          uid: adminUid,
          fullName: 'Administrator',
          username: 'Administrator',
          email: PREDEFINED_ADMIN_EMAIL,
          friendCode: 'ADMIN-0001',
          bio: 'Official System Administrator for TheRoom.',
          photoURL: '',
          status: 'online',
          lastSeen: serverTimestamp(),
          friendsCount: 0,
          accountStatus: 'active',
          isAdmin: true,
          isMainAdmin: true,
          isModerator: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(adminRef, adminProfile, { merge: true });
        await setDoc(doc(db, 'admins', adminUid), {
          uid: adminUid,
          email: PREDEFINED_ADMIN_EMAIL,
          createdAt: serverTimestamp()
        }, { merge: true });

        // Clean any duplicate admin documents created previously
        await cleanDuplicateAdminDocs();
      } catch (err) {
        console.warn('Notice seeding predefined admin:', err);
      }
    };
    seedAdmin();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (activeUnsubscribeProfileRef.current) {
        activeUnsubscribeProfileRef.current();
        activeUnsubscribeProfileRef.current = null;
      }

      const storedUid = localStorage.getItem(STORAGE_KEY);
      const targetUid = user?.uid || storedUid;

      if (targetUid) {
        const userRef = doc(db, 'users', targetUid);
        const unsub = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Check account status
            if (data.accountStatus === 'blocked') {
              if (user) await firebaseSignOut(auth).catch(() => {});
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.clear();
              setUserProfile(null);
              alert('Your account has been blocked by an administrator.');
              setLoading(false);
              return;
            }
            if (data.accountStatus === 'deactivated') {
              if (user) await firebaseSignOut(auth).catch(() => {});
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.clear();
              setUserProfile(null);
              alert('Your account has been deactivated.');
              setLoading(false);
              return;
            }

            // Flag main admin and moderator status
            const isMainAdmin = data.isMainAdmin || (data.email && data.email.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase());
            const isModerator = !!data.isModerator;
            const isAdmin = data.isAdmin || isMainAdmin || isModerator;
            
            setUserProfile({
              ...data,
              isAdmin,
              isMainAdmin,
              isModerator,
            });
            localStorage.setItem(STORAGE_KEY, targetUid);
          } else {
            // Auto-heal: Ensure user profile document exists in Firestore
            if (user) {
              try {
                const friendCode = await generateUniqueFriendCode();
                const isMainAdmin = user.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase();
                const fallbackProfile: UserProfile = {
                  uid: user.uid,
                  fullName: user.displayName || user.email?.split('@')[0] || 'User',
                  username: (user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`).toLowerCase().replace(/[^a-z0-9]/g, ''),
                  email: user.email?.toLowerCase() || '',
                  friendCode: friendCode,
                  bio: 'Hello! I am using TheRoom.',
                  photoURL: user.photoURL || '',
                  status: 'online',
                  lastSeen: serverTimestamp(),
                  friendsCount: 0,
                  accountStatus: 'active',
                  isAdmin: isMainAdmin,
                  isMainAdmin: isMainAdmin,
                  isModerator: false,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                };
                await setDoc(userRef, fallbackProfile, { merge: true });
                setUserProfile(fallbackProfile);
                localStorage.setItem(STORAGE_KEY, user.uid);
              } catch (fallbackErr) {
                console.warn('Fallback profile creation notice:', fallbackErr);
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.clear();
                setUserProfile(null);
              }
            } else {
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.clear();
              setUserProfile(null);
            }
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile snapshot error:', err);
          setLoading(false);
        });

        activeUnsubscribeProfileRef.current = unsub;

        // Set online status
        try {
          await updateDoc(userRef, {
            status: 'online',
            lastSeen: serverTimestamp()
          });
        } catch (e) {
          console.warn('Could not update online status:', e);
        }

        // Set offline when browser closes or hides
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            updateDoc(userRef, {
              status: 'offline',
              lastSeen: serverTimestamp()
            }).catch(() => {});
          } else if (document.visibilityState === 'visible') {
            updateDoc(userRef, {
              status: 'online',
              lastSeen: serverTimestamp()
            }).catch(() => {});
          }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          if (activeUnsubscribeProfileRef.current) {
            activeUnsubscribeProfileRef.current();
            activeUnsubscribeProfileRef.current = null;
          }
          window.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (activeUnsubscribeProfileRef.current) {
        activeUnsubscribeProfileRef.current();
        activeUnsubscribeProfileRef.current = null;
      }
    };
  }, []);

  const signUp = async (data: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    dateOfBirth?: string;
    country?: string;
    city?: string;
    phoneNumber?: string;
    photoURL?: string;
  }) => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanUsername = data.username.trim().toLowerCase().replace(/\s+/g, '');
      const cleanPhone = data.phoneNumber?.trim();

      // Check if Google email
      if (!isGoogleEmail(cleanEmail)) {
        throw new Error('Account not identified. Please use a valid Google email address (@gmail.com) to create an account.');
      }

      // 1. Reserved Main Admin Credentials Check
      if (cleanEmail === PREDEFINED_ADMIN_EMAIL.toLowerCase()) {
        throw new Error('Email is already taken.');
      }
      if (cleanUsername === 'administrator' || cleanUsername === 'admin') {
        throw new Error('Username is already taken.');
      }

      // 2. Targeted Query Firestore for Duplicate Email, Username, or Phone Number
      const emailQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const emailSnap = await getDocs(emailQ);
      if (!emailSnap.empty) {
        throw new Error('Email is already taken.');
      }

      const usernameQ = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const usernameSnap = await getDocs(usernameQ);
      if (!usernameSnap.empty) {
        throw new Error('Username is already taken.');
      }

      if (cleanPhone) {
        const phoneQ = query(collection(db, 'users'), where('phoneNumber', '==', cleanPhone));
        const phoneSnap = await getDocs(phoneQ);
        if (!phoneSnap.empty) {
          throw new Error('Phone number is already taken.');
        }
      }

      // 3. Create Firebase Auth user
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      } catch (authErr: any) {
        if (authErr.code === 'auth/operation-not-allowed' || authErr.message?.includes('operation-not-allowed')) {
          console.warn('Firebase Email/Password Auth is disabled in Firebase console. Initializing mock fallback user.');
          const customUid = `usr_${Date.now()}`;
          userCred = { user: { uid: customUid } } as any;
        } else if (authErr.code === 'auth/email-already-in-use') {
          throw new Error('Email is already taken.');
        } else {
          throw authErr;
        }
      }

      const friendCode = await generateUniqueFriendCode();
      const safePhotoURL = await sanitizePhotoURL(data.photoURL);

      const newProfile: UserProfile = {
        uid: userCred.user.uid,
        fullName: data.fullName,
        username: cleanUsername,
        email: cleanEmail,
        friendCode: friendCode,
        bio: 'Hello! I am using TheRoom.',
        photoURL: safePhotoURL,
        status: 'online',
        lastSeen: serverTimestamp(),
        friendsCount: 0,
        country: data.country || '',
        city: data.city || '',
        phoneNumber: data.phoneNumber || '',
        dateOfBirth: data.dateOfBirth || '',
        accountStatus: 'active',
        isAdmin: false,
        isMainAdmin: false,
        isModerator: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userCred.user.uid), newProfile);
      localStorage.setItem(STORAGE_KEY, userCred.user.uid);
      setUserProfile(newProfile);
    } catch (err: any) {
      console.error('Sign up error:', err);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Special handling for predefined Main Admin account (admin@privatechat.com)
      if (cleanEmail === PREDEFINED_ADMIN_EMAIL.toLowerCase()) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr) {
              console.warn('Admin account creation notice:', createErr);
            }
          }
        }

        const adminUid = 'admin_predefined';
        const adminProfile: UserProfile = {
          uid: adminUid,
          fullName: 'Administrator',
          username: 'Administrator',
          email: PREDEFINED_ADMIN_EMAIL,
          friendCode: 'ADMIN-0001',
          bio: 'Official System Administrator for TheRoom.',
          photoURL: '',
          status: 'online',
          lastSeen: serverTimestamp(),
          friendsCount: 0,
          accountStatus: 'active',
          isAdmin: true,
          isMainAdmin: true,
          isModerator: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', adminUid), adminProfile, { merge: true });
        await setDoc(doc(db, 'admins', adminUid), {
          uid: adminUid,
          email: PREDEFINED_ADMIN_EMAIL,
          createdAt: serverTimestamp()
        }, { merge: true });

        await cleanDuplicateAdminDocs();

        localStorage.setItem(STORAGE_KEY, adminUid);
        setUserProfile(adminProfile);
        return;
      }

      // Standard user sign in
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/operation-not-allowed' || signInErr.message?.includes('operation-not-allowed')) {
          console.warn('Firebase Email/Password auth is disabled. Falling back to Firestore profile lookup.');
          const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
          
          if (!usersSnap.empty) {
            const userDocData = usersSnap.docs[0].data() as UserProfile;
            if (userDocData.accountStatus === 'blocked') {
              throw new Error('Your account has been blocked by an administrator.');
            }
            if (userDocData.accountStatus === 'deactivated') {
              throw new Error('Your account has been deactivated.');
            }
            localStorage.setItem(STORAGE_KEY, userDocData.uid);
            setUserProfile(userDocData);
            return;
          } else {
            throw new Error('Account not found with this email.');
          }
        } else {
          throw signInErr;
        }
      }

      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        if (data.accountStatus === 'blocked') {
          await firebaseSignOut(auth);
          throw new Error('Your account has been blocked by an administrator.');
        }
        if (data.accountStatus === 'deactivated') {
          await firebaseSignOut(auth);
          throw new Error('Your account has been deactivated.');
        }

        await updateDoc(doc(db, 'users', cred.user.uid), {
          status: 'online',
          lastSeen: serverTimestamp()
        });
        localStorage.setItem(STORAGE_KEY, cred.user.uid);
        setUserProfile(data);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      
      if (!userDoc.exists()) {
        const friendCode = await generateUniqueFriendCode();
        const isMainAdmin = cred.user.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase();

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          fullName: cred.user.displayName || 'User',
          username: (cred.user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, ''),
          email: cred.user.email?.toLowerCase() || '',
          friendCode: friendCode,
          bio: 'Hello! I am using TheRoom.',
          photoURL: cred.user.photoURL || '',
          status: 'online',
          lastSeen: serverTimestamp(),
          friendsCount: 0,
          accountStatus: 'active',
          isAdmin: isMainAdmin,
          isMainAdmin: isMainAdmin,
          isModerator: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        
        if (isMainAdmin) {
          await setDoc(doc(db, 'admins', cred.user.uid), {
            uid: cred.user.uid,
            email: cred.user.email,
            createdAt: serverTimestamp()
          });
        }
        localStorage.setItem(STORAGE_KEY, cred.user.uid);
        setUserProfile(newProfile);
      } else {
        const data = userDoc.data() as UserProfile;
        if (data.accountStatus === 'blocked') {
          await firebaseSignOut(auth);
          throw new Error('Your account has been blocked by an administrator.');
        }
        if (data.accountStatus === 'deactivated') {
          await firebaseSignOut(auth);
          throw new Error('Your account has been deactivated.');
        }

        await updateDoc(doc(db, 'users', cred.user.uid), {
          status: 'online',
          lastSeen: serverTimestamp()
        });
        localStorage.setItem(STORAGE_KEY, cred.user.uid);
        setUserProfile(data);
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      throw err;
    }
  };

  const signInAsGuest = async (asAdmin: boolean = false) => {
    try {
      if (asAdmin) {
        const adminUid = 'admin_predefined';
        const adminProfile: UserProfile = {
          uid: adminUid,
          fullName: 'Administrator',
          username: 'Administrator',
          email: PREDEFINED_ADMIN_EMAIL,
          friendCode: 'ADMIN-0001',
          bio: 'Official System Administrator for TheRoom.',
          photoURL: '',
          status: 'online',
          lastSeen: serverTimestamp(),
          friendsCount: 0,
          accountStatus: 'active',
          isAdmin: true,
          isMainAdmin: true,
          isModerator: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        try {
          await setDoc(doc(db, 'users', adminUid), adminProfile, { merge: true });
          await setDoc(doc(db, 'admins', adminUid), {
            uid: adminUid,
            email: PREDEFINED_ADMIN_EMAIL,
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn('Could not update admin profile in Firestore:', e);
        }

        localStorage.setItem(STORAGE_KEY, adminUid);
        setUserProfile(adminProfile);
        return;
      }

      let uid = '';
      const email = `guest_${Date.now()}@privatechat.app`;
      
      try {
        const anonCred = await signInAnonymously(auth);
        uid = anonCred.user.uid;
      } catch (anonErr: any) {
        console.warn('Anonymous sign in failed or disabled, generating session ID:', anonErr);
        uid = `guest_${Date.now()}`;
      }

      const friendCode = await generateUniqueFriendCode();
      const guestProfile: UserProfile = {
        uid,
        fullName: 'Guest User',
        username: `guest_${uid.slice(-4)}`,
        email,
        friendCode: friendCode,
        bio: 'Guest user on TheRoom.',
        photoURL: '',
        status: 'online',
        lastSeen: serverTimestamp(),
        friendsCount: 0,
        accountStatus: 'active',
        isAdmin: false,
        isMainAdmin: false,
        isModerator: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), guestProfile);
      } catch (e) {
        console.warn('Could not write guest profile to Firestore:', e);
      }

      localStorage.setItem(STORAGE_KEY, uid);
      setUserProfile(guestProfile);
    } catch (err: any) {
      console.error('Guest sign in error:', err);
      throw err;
    }
  };

  const logOut = async () => {
    // 1. Instantly detach snapshot listener so real-time offline updates don't trigger re-login
    if (activeUnsubscribeProfileRef.current) {
      try {
        activeUnsubscribeProfileRef.current();
      } catch (e) {
        console.warn('Unsubscribe notice on logout:', e);
      }
      activeUnsubscribeProfileRef.current = null;
    }

    const activeUid = userProfile?.uid || firebaseUser?.uid;

    // 2. Clear storage keys and reset React context state immediately
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    setUserProfile(null);
    setFirebaseUser(null);

    // 3. Perform Firebase sign out
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Sign out notice:', e);
    }

    // 4. Update online status to offline in background
    if (activeUid) {
      try {
        await updateDoc(doc(db, 'users', activeUid), {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      } catch (e) {
        console.warn('Error setting offline status on logout:', e);
      }
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isGoogleEmail(cleanEmail)) {
      throw new Error('Account not identified. Password reset is only supported for registered Google email addresses (@gmail.com).');
    }

    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
    } catch (err: any) {
      console.warn('Firebase sendPasswordResetEmail error:', err);
      // Fallback if actionCodeSettings fails or default reset email fails
      if (err.code === 'auth/invalid-continue-uri' || err.code === 'auth/unauthorized-domain') {
        await sendPasswordResetEmail(auth, cleanEmail);
      } else {
        throw err;
      }
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const activeUid = userProfile?.uid || firebaseUser?.uid;
    if (!activeUid) return;
    // Prevent updating Friend Code
    delete updates.friendCode;
    delete updates.uid;
    delete updates.email;

    if (updates.photoURL) {
      updates.photoURL = await sanitizePhotoURL(updates.photoURL);
    }

    const userRef = doc(db, 'users', activeUid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const changePasswordWithOldPassword = async (oldPassword: string, newPassword: string) => {
    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || userProfile?.email;

    if (!currentUser || !userEmail) {
      throw new Error('No authenticated user session found. Please sign in first.');
    }

    if (!oldPassword) {
      throw new Error('Please enter your current password.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    try {
      const credential = EmailAuthProvider.credential(userEmail, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
    } catch (reauthErr: any) {
      console.error('Reauthentication error:', reauthErr);
      if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
        throw new Error('Incorrect current password. Please check your credentials and try again.');
      }
      throw new Error('Current password verification failed: ' + (reauthErr.message || 'Invalid credentials'));
    }

    await firebaseUpdatePassword(currentUser, newPassword);
  };

  const confirmPasswordResetWithCode = async (oobCode: string, newPassword: string) => {
    if (!oobCode) {
      throw new Error('Invalid or missing password reset code.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    await confirmPasswordReset(auth, oobCode, newPassword);
  };

  const refreshProfile = async () => {
    const activeUid = userProfile?.uid || firebaseUser?.uid;
    if (activeUid) {
      const snap = await getDoc(doc(db, 'users', activeUid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    }
  };

  const isMainAdmin = !!(userProfile?.isMainAdmin || userProfile?.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase());
  const isModerator = !!userProfile?.isModerator;
  const isAdmin = !!(userProfile?.isAdmin || isMainAdmin || isModerator);

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signInAsGuest,
      logOut,
      resetPassword,
      updateProfileData,
      changePassword,
      changePasswordWithOldPassword,
      confirmPasswordResetWithCode,
      isAdmin,
      isMainAdmin,
      isModerator,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
