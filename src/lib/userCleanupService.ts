import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc, 
  setDoc,
  updateDoc,
  arrayRemove 
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteChatById, deletePrivateChatBetweenUsers } from './chatService';

/**
 * Permanently deletes a user account and ALL associated database artifacts:
 * - Direct/private chat documents and message subcollections
 * - Group chat member entries and ownership
 * - Friendships and friend requests
 * - Notifications
 * - User profile document
 */
export async function deleteUserAccountAndAllData(targetUid: string): Promise<void> {
  if (!targetUid) return;

  try {
    // 1. Clean up Friendships
    const friendshipsRef = collection(db, 'friendships');
    const qFriendships = query(friendshipsRef, where('users', 'array-contains', targetUid));
    const snapFriendships = await getDocs(qFriendships);

    for (const fDoc of snapFriendships.docs) {
      const data = fDoc.data();
      const usersArr = (data.users || []) as string[];
      const otherUid = usersArr.find((id) => id !== targetUid);

      // Decrement friend count for the other friend if still present
      if (otherUid) {
        try {
          const otherDoc = await getDoc(doc(db, 'users', otherUid));
          if (otherDoc.exists()) {
            const curCount = Math.max(0, (otherDoc.data().friendsCount || 1) - 1);
            await updateDoc(doc(db, 'users', otherUid), { friendsCount: curCount }).catch(() => {});
          }
        } catch (e) {
          console.warn('Error updating friend count for remaining friend:', e);
        }

        // Delete private chats between targetUid and otherUid
        await deletePrivateChatBetweenUsers(targetUid, otherUid).catch(() => {});
      }

      await deleteDoc(fDoc.ref).catch(() => {});
    }

    // 2. Clean up Friend Requests (sent or received)
    const reqsRef = collection(db, 'friendRequests');
    const snapSent = await getDocs(query(reqsRef, where('senderId', '==', targetUid))).catch(() => null);
    if (snapSent) {
      for (const rDoc of snapSent.docs) {
        await deleteDoc(rDoc.ref).catch(() => {});
      }
    }

    const snapRecv = await getDocs(query(reqsRef, where('receiverId', '==', targetUid))).catch(() => null);
    if (snapRecv) {
      for (const rDoc of snapRecv.docs) {
        await deleteDoc(rDoc.ref).catch(() => {});
      }
    }

    // 3. Clean up Chats
    const chatsRef = collection(db, 'chats');
    const snapChats = await getDocs(query(chatsRef, where('members', 'array-contains', targetUid))).catch(() => null);

    if (snapChats) {
      for (const cDoc of snapChats.docs) {
        const cData = cDoc.data();
        const chatId = cDoc.id;

        if (cData.type === 'private') {
          // Delete private chat completely
          await deleteChatById(chatId).catch(() => {});
        } else if (cData.type === 'group') {
          const members = (cData.members || []) as string[];
          const remainingMembers = members.filter((id) => id !== targetUid);

          if (remainingMembers.length <= 1) {
            // Delete group chat if empty or only 1 person left
            await deleteChatById(chatId).catch(() => {});
          } else {
            // Remove targetUid from members & memberDetails & unreadCounts
            const memberDetails = { ...(cData.memberDetails || {}) };
            delete memberDetails[targetUid];

            const unreadCounts = { ...(cData.unreadCounts || {}) };
            delete unreadCounts[targetUid];

            const updates: Record<string, any> = {
              members: remainingMembers,
              memberDetails,
              unreadCounts
            };

            // Transfer ownership if targetUid was owner
            if (cData.ownerId === targetUid && remainingMembers.length > 0) {
              updates.ownerId = remainingMembers[0];
            }

            await updateDoc(doc(db, 'chats', chatId), updates).catch(() => {});
          }
        }
      }
    }

    // 4. Clean up Notifications
    const notifRef = collection(db, 'notifications');
    const snapNotifs = await getDocs(query(notifRef, where('userId', '==', targetUid))).catch(() => null);
    if (snapNotifs) {
      for (const nDoc of snapNotifs.docs) {
        await deleteDoc(nDoc.ref).catch(() => {});
      }
    }

    // 5. Delete User Profile document
    await deleteDoc(doc(db, 'users', targetUid)).catch(() => {});

  } catch (err) {
    console.error('Error in deleteUserAccountAndAllData:', err);
    throw err;
  }
}
