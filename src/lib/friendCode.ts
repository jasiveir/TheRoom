import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export function generateFriendCodeCandidate(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous 0/O, 1/I
  let result = 'PC-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUniqueFriendCode(): Promise<string> {
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    code = generateFriendCodeCandidate();
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('friendCode', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) {
        isUnique = true;
      }
    } catch (e) {
      console.warn('Friend code uniqueness check fallback:', e);
      isUnique = true;
    }
    attempts++;
  }

  return code;
}
