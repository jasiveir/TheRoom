export type AccountStatus = 'active' | 'blocked' | 'deactivated';

export interface UserProfile {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  friendCode: string; // e.g. PC-8F2X-LQ71
  bio?: string;
  photoURL?: string;
  status: 'online' | 'offline';
  lastSeen: any; // Timestamp
  friendsCount: number;
  country?: string;
  city?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  accountStatus: AccountStatus;
  isAdmin?: boolean;
  isModerator?: boolean;
  isMainAdmin?: boolean;
  createdAt: any; // Timestamp
  updatedAt: any;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: RequestStatus;
  createdAt: any;
  senderProfile?: Partial<UserProfile>;
  receiverProfile?: Partial<UserProfile>;
}

export interface Friendship {
  id: string;
  users: [string, string]; // [uid1, uid2]
  createdAt: any;
}

export interface MemberDetail {
  uid: string;
  fullName: string;
  username: string;
  photoURL?: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  members: string[]; // user IDs
  memberDetails: Record<string, MemberDetail>;
  name?: string; // Group name
  photoURL?: string; // Group photo
  description?: string; // Group description
  ownerId?: string; // Group owner
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageTime?: any;
  lastMessageDeletedAt?: number;
  lastMessageDeletedExpiresAt?: number;
  unreadCounts?: Record<string, number>;
  typing?: Record<string, boolean>;
  pinnedMessageIds?: string[];
  createdAt: any;
  updatedAt?: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image';
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  deliveredTo: string[]; // Array of user UIDs
  readBy: string[]; // Array of user UIDs
  createdAt: any; // Timestamp
  editedAt?: any;
  isDeleted?: boolean;
  deleteType?: 'forEveryone' | 'forSelf';
  deletedFor?: string[]; // Array of user UIDs who deleted it for themselves
  deletedAt?: number;
  deletedExpiresAt?: number;
  disappearingDuration?: number; // In seconds (e.g. 10, 30, 60, 300, 3600, 86400)
  expiresAt?: number; // Timestamp in ms when message should disappear
  scheduledFor?: number; // Timestamp in ms when message should be delivered/visible
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'request_accepted' | 'new_message' | 'group_invite' | 'account_status';
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  link?: string;
  data?: Record<string, any>;
}

export interface UserSettings {
  notificationSounds: boolean;
  desktopNotifications: boolean;
  darkMode: boolean;
}
