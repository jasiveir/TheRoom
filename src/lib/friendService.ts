import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, FriendRequest, Friendship } from '../types';
import { getOrCreatePrivateChat, deletePrivateChatBetweenUsers } from './chatService';

/**
 * STRICT FRIEND DISCOVERY RULE:
 * Global search by name, username, email or phone is DISABLED.
 * The ONLY allowed way to find a user is by entering their exact Friend Code.
 */
export async function findUserByFriendCode(friendCode: string): Promise<UserProfile | null> {
  const formattedCode = friendCode.trim().toUpperCase();
  if (!formattedCode) {
    return null;
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('friendCode', '==', formattedCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const userDoc = snap.docs[0];
  return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
}

export async function sendFriendRequest(sender: UserProfile, receiver: UserProfile): Promise<void> {
  if (sender.uid === receiver.uid) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  // Check if friendship already exists
  const isFriends = await checkIsFriend(sender.uid, receiver.uid);
  if (isFriends) {
    throw new Error('You are already friends with this user.');
  }

  // Check for existing pending request safely using single-field query
  const requestsRef = collection(db, 'friendRequests');
  try {
    const snap1 = await getDocs(query(requestsRef, where('senderId', '==', sender.uid)));
    const existing1 = snap1.docs.find((d) => {
      const data = d.data();
      return data.receiverId === receiver.uid && data.status === 'pending';
    });
    if (existing1) {
      throw new Error('Friend request already sent.');
    }

    const snap2 = await getDocs(query(requestsRef, where('receiverId', '==', sender.uid)));
    const existing2 = snap2.docs.find((d) => {
      const data = d.data();
      return data.senderId === receiver.uid && data.status === 'pending';
    });
    if (existing2) {
      throw new Error('This user has already sent you a friend request. Check your incoming requests!');
    }
  } catch (err: any) {
    if (err.message?.includes('already sent') || err.message?.includes('incoming requests')) {
      throw err;
    }
    console.warn('Notice checking pending friend requests:', err);
  }

  // Create Request
  const reqData = {
    senderId: sender.uid,
    receiverId: receiver.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
    senderProfile: {
      uid: sender.uid,
      fullName: sender.fullName || sender.username || 'User',
      username: sender.username || 'user',
      photoURL: sender.photoURL || '',
      friendCode: sender.friendCode || ''
    },
    receiverProfile: {
      uid: receiver.uid,
      fullName: receiver.fullName || receiver.username || 'User',
      username: receiver.username || 'user',
      photoURL: receiver.photoURL || '',
      friendCode: receiver.friendCode || ''
    }
  };

  const reqRef = await addDoc(collection(db, 'friendRequests'), reqData);

  // Send Notification to receiver safely
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: receiver.uid,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${sender.fullName || sender.username} sent you a friend request.`,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        requestId: reqRef.id,
        senderId: sender.uid
      }
    });
  } catch (err) {
    console.warn('Notice sending friend request notification:', err);
  }
}

export async function acceptFriendRequest(request: FriendRequest, receiver: UserProfile): Promise<void> {
  const senderId = request.senderId || request.senderProfile?.uid;
  const receiverId = request.receiverId || request.receiverProfile?.uid || receiver.uid;

  if (!senderId || !receiverId) {
    throw new Error('Invalid friend request: missing sender or receiver ID.');
  }

  if (senderId === receiverId) {
    await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' }).catch(() => {});
    return;
  }

  // Check if they are already friends to prevent duplicate count increments
  const isAlreadyFriends = await checkIsFriend(senderId, receiverId);
  if (isAlreadyFriends) {
    await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' }).catch(() => {});
    return;
  }

  const batch = writeBatch(db);

  // Update request status
  const reqRef = doc(db, 'friendRequests', request.id);
  batch.update(reqRef, { status: 'accepted' });

  // Clean up any other pending requests between these two users
  try {
    const reqsRef = collection(db, 'friendRequests');
    const snapSender = await getDocs(query(reqsRef, where('senderId', '==', senderId)));
    snapSender.docs.forEach((d) => {
      if (d.data().receiverId === receiverId && d.id !== request.id) {
        batch.update(d.ref, { status: 'accepted' });
      }
    });
    const snapReceiver = await getDocs(query(reqsRef, where('senderId', '==', receiverId)));
    snapReceiver.docs.forEach((d) => {
      if (d.data().receiverId === senderId && d.id !== request.id) {
        batch.update(d.ref, { status: 'accepted' });
      }
    });
  } catch (err) {
    console.warn('Notice cleaning pending requests batch:', err);
  }

  // Create friendship document
  const friendshipId = [senderId, receiverId].sort().join('_');
  const friendshipRef = doc(db, 'friendships', friendshipId);
  batch.set(friendshipRef, {
    id: friendshipId,
    users: [senderId, receiverId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();

  // Increment friends count and pre-create private chat for both users
  try {
    let senderProfile: UserProfile | null = null;
    const senderDoc = await getDoc(doc(db, 'users', senderId));
    if (senderDoc.exists()) {
      senderProfile = { uid: senderDoc.id, ...senderDoc.data() } as UserProfile;
      const currentCount = senderDoc.data().friendsCount || 0;
      await updateDoc(doc(db, 'users', senderId), { friendsCount: currentCount + 1 }).catch(() => {});
    } else if (request.senderProfile?.uid) {
      senderProfile = {
        uid: request.senderProfile.uid,
        fullName: request.senderProfile.fullName || 'User',
        username: request.senderProfile.username || 'user',
        friendCode: request.senderProfile.friendCode || '',
        photoURL: request.senderProfile.photoURL || '',
        email: '',
        bio: '',
        status: 'online',
        friendsCount: 1,
        country: '',
        city: '',
        phoneNumber: '',
        dateOfBirth: '',
        accountStatus: 'active',
        isAdmin: false,
        isMainAdmin: false,
        isModerator: false,
        lastSeen: serverTimestamp() as any,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };
    }

    const receiverDoc = await getDoc(doc(db, 'users', receiverId));
    if (receiverDoc.exists()) {
      const currentCount = receiverDoc.data().friendsCount || 0;
      await updateDoc(doc(db, 'users', receiverId), { friendsCount: currentCount + 1 }).catch(() => {});
    }

    if (senderProfile) {
      await getOrCreatePrivateChat(receiver, senderProfile);
    }
  } catch (e) {
    console.warn('Error updating friend counts or creating chat:', e);
  }

  // Send Notification to original sender
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: senderId,
      type: 'request_accepted',
      title: 'Friend Request Accepted',
      body: `${receiver.fullName || receiver.username} accepted your friend request!`,
      read: false,
      createdAt: serverTimestamp(),
      data: { friendId: receiverId }
    });
  } catch (err) {
    console.warn('Error sending acceptance notification:', err);
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
}

export async function checkIsFriend(uid1: string, uid2: string): Promise<boolean> {
  if (!uid1 || !uid2) return false;
  const friendshipId = [uid1, uid2].sort().join('_');
  const snap = await getDoc(doc(db, 'friendships', friendshipId));
  return snap.exists();
}

/**
 * UNFRIEND WORKFLOW:
 * Removes friendship record from Firebase, deletes corresponding friend requests,
 * decrements friend count, disables private messaging between them.
 */
export async function unfriendUser(currentUserId: string, friendId: string): Promise<void> {
  const friendshipId = [currentUserId, friendId].sort().join('_');
  await deleteDoc(doc(db, 'friendships', friendshipId));

  // Also clean up any friend request documents between these two users so auto-heal won't recreate friendship
  try {
    const reqsRef = collection(db, 'friendRequests');
    const snap1 = await getDocs(query(reqsRef, where('senderId', '==', currentUserId)));
    for (const d of snap1.docs) {
      if (d.data().receiverId === friendId) {
        await deleteDoc(doc(db, 'friendRequests', d.id)).catch(() => {});
      }
    }
    const snap2 = await getDocs(query(reqsRef, where('receiverId', '==', currentUserId)));
    for (const d of snap2.docs) {
      if (d.data().senderId === friendId) {
        await deleteDoc(doc(db, 'friendRequests', d.id)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Notice cleaning friend requests on unfriend:', err);
  }

  // Delete all private chat history and chat feed documents between these two users
  await deletePrivateChatBetweenUsers(currentUserId, friendId);

  // Update friend counts safely
  try {
    const u1Snap = await getDoc(doc(db, 'users', currentUserId));
    if (u1Snap.exists()) {
      const count = Math.max(0, (u1Snap.data().friendsCount || 1) - 1);
      await updateDoc(doc(db, 'users', currentUserId), { friendsCount: count });
    }
    const u2Snap = await getDoc(doc(db, 'users', friendId));
    if (u2Snap.exists()) {
      const count = Math.max(0, (u2Snap.data().friendsCount || 1) - 1);
      await updateDoc(doc(db, 'users', friendId), { friendsCount: count });
    }
  } catch (e) {
    console.warn('Error decrementing friend counts on unfriend:', e);
  }
}
