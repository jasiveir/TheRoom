import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, PREDEFINED_ADMIN_EMAIL } from '../context/AuthContext';
import { useLayoutTemplate } from '../context/LayoutTemplateContext';
import { UserProfile, AccountStatus } from '../types';
import { 
  wipeAllChatMessages, 
  scheduleMessageWipe, 
  cancelScheduledMessageWipe, 
  subscribeSystemSettings, 
  SystemSettings 
} from '../lib/messageCleanup';
import { 
  Shield, 
  Users, 
  Search, 
  Ban, 
  CheckCircle, 
  Power, 
  Trash2, 
  KeyRound, 
  Activity, 
  ShieldAlert, 
  ShieldCheck,
  Award,
  Clock,
  Calendar as CalendarIcon,
  Flame,
  AlertTriangle,
  XCircle,
  Sparkles,
  CheckSquare,
  Square,
  AlertOctagon
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { template } = useLayoutTemplate();
  const { userProfile, isAdmin, isMainAdmin, resetPassword } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'deactivated' | 'online' | 'moderators'>('all');

  // Selected Users State for Batch Operations
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  // Wipe All Accounts Modal State
  const [showWipeAccountsModal, setShowWipeAccountsModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [wipeAccountsLoading, setWipeAccountsLoading] = useState(false);

  // Message Wipe State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [wipeStatusMessage, setWipeStatusMessage] = useState<string | null>(null);

  // Custom Modal Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = snapshot.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as Omit<UserProfile, 'uid'>)
      }));
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching admin users:', err);
      setLoading(false);
    });

    const unsubscribeSys = subscribeSystemSettings((settings) => {
      setSystemSettings(settings);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSys();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#fbfaf6]">
        <ShieldAlert className="w-12 h-12 text-rose-600 mb-3" />
        <h2 className="text-lg font-bold text-black">Access Denied</h2>
        <p className="text-xs text-zinc-600 max-w-sm mt-1">
          This route (/admin) is restricted exclusively to system administrators and moderators.
        </p>
      </div>
    );
  }

  // Handle Immediate Chat Message Wipe
  const handleInstantWipe = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Wipe All Chat Messages',
      message: 'Are you sure you want to permanently delete ALL chat messages and attachments across ALL registered users? This action cannot be undone.',
      confirmText: 'Wipe Messages Now',
      isDanger: true,
      onConfirm: async () => {
        setWipeLoading(true);
        setWipeStatusMessage(null);
        try {
          const result = await wipeAllChatMessages();
          const msg = `Successfully wiped ${result.deletedMessagesCount} messages across ${result.chatsResetCount} chats.`;
          setWipeStatusMessage(msg);
          showToast(msg, 'success');
        } catch (err: any) {
          console.error('Failed to wipe messages:', err);
          showToast(`Failed to wipe messages: ${err.message}`, 'error');
        } finally {
          setWipeLoading(false);
        }
      }
    });
  };

  // Handle Scheduling Chat Wipe Date & Time
  const handleSetSchedule = async (e?: React.FormEvent, customTs?: number) => {
    if (e) e.preventDefault();

    let ts = customTs;
    if (!ts) {
      if (!selectedDateTime) {
        showToast('Please select a date and time for the scheduled wipe.', 'error');
        return;
      }
      ts = new Date(selectedDateTime).getTime();
    }

    if (isNaN(ts) || ts <= Date.now()) {
      showToast('Scheduled wipe time must be in the future.', 'error');
      return;
    }

    setScheduleLoading(true);
    try {
      await scheduleMessageWipe(ts, userProfile?.email);
      setSelectedDateTime('');
      showToast(`Scheduled message wipe configured for ${new Date(ts).toLocaleString()}`, 'success');
    } catch (err: any) {
      showToast(`Failed to schedule wipe: ${err.message}`, 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleQuickPreset = (hoursFromNow: number) => {
    const targetMs = Date.now() + hoursFromNow * 60 * 60 * 1000;
    handleSetSchedule(undefined, targetMs);
  };

  const handleCancelSchedule = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Scheduled Wipe',
      message: 'Are you sure you want to cancel the scheduled chat message wipe?',
      confirmText: 'Cancel Scheduled Wipe',
      isDanger: false,
      onConfirm: async () => {
        try {
          await cancelScheduledMessageWipe();
          showToast('Scheduled chat wipe cancelled.', 'info');
        } catch (err: any) {
          showToast(`Failed to cancel scheduled wipe: ${err.message}`, 'error');
        }
      }
    });
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.friendCode?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'online') return u.status === 'online';
    if (statusFilter === 'moderators') return !!u.isModerator;
    return u.accountStatus === statusFilter;
  });

  // Checkbox selection helpers
  const handleSelectAll = () => {
    if (selectedUids.length === filteredUsers.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(filteredUsers.map((u) => u.uid));
    }
  };

  const handleToggleSelectUser = (uid: string) => {
    setSelectedUids((prev) => 
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Real Working Account Management Actions
  const handleUpdateStatus = (uid: string, newStatus: AccountStatus, name: string) => {
    const targetUser = users.find((u) => u.uid === uid);
    if (targetUser?.isMainAdmin || targetUser?.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase()) {
      showToast('The Main Administrator account is permanently protected and cannot be modified.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Set Account Status: ${newStatus.toUpperCase()}`,
      message: `Are you sure you want to set ${name}'s account status to "${newStatus.toUpperCase()}"?`,
      confirmText: `Confirm ${newStatus.toUpperCase()}`,
      isDanger: newStatus === 'blocked' || newStatus === 'deactivated',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            accountStatus: newStatus,
            updatedAt: serverTimestamp()
          });
          showToast(`Account ${name} is now ${newStatus.toUpperCase()}.`, 'success');
        } catch (err: any) {
          console.error('Error updating account status:', err);
          showToast(`Could not update status: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleDeleteUser = (uid: string, name: string) => {
    const targetUser = users.find((u) => u.uid === uid);
    if (targetUser?.isMainAdmin || targetUser?.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase()) {
      showToast('The Main Administrator account is permanently protected and cannot be deleted.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete Account: ${name}`,
      message: `PERMANENT DELETE: Delete user account "${name}"? This action CANNOT be undone.`,
      confirmText: 'Delete Account',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid));
          setSelectedUids((prev) => prev.filter((id) => id !== uid));
          showToast(`User account "${name}" was permanently deleted.`, 'success');
        } catch (err: any) {
          console.error('Error deleting user:', err);
          showToast(`Could not delete user: ${err.message}`, 'error');
        }
      }
    });
  };

  // Delete Selected Accounts (Batch)
  const handleDeleteSelected = () => {
    if (selectedUids.length === 0) return;

    // Filter out protected main admins
    const deletableUids = selectedUids.filter((uid) => {
      const u = users.find((item) => item.uid === uid);
      return u && !u.isMainAdmin && u.email?.toLowerCase() !== PREDEFINED_ADMIN_EMAIL.toLowerCase();
    });

    if (deletableUids.length === 0) {
      showToast('Selected accounts are protected administrators and cannot be deleted.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete ${deletableUids.length} Selected Account(s)`,
      message: `PERMANENT DELETE BATCH: Are you sure you want to permanently delete ${deletableUids.length} selected account(s)? This action cannot be undone.`,
      confirmText: `Delete ${deletableUids.length} Accounts`,
      isDanger: true,
      onConfirm: async () => {
        try {
          for (const uid of deletableUids) {
            await deleteDoc(doc(db, 'users', uid));
          }
          setSelectedUids([]);
          showToast(`Successfully deleted ${deletableUids.length} account(s).`, 'success');
        } catch (err: any) {
          console.error('Error batch deleting users:', err);
          showToast(`Error deleting selected accounts: ${err.message}`, 'error');
        }
      }
    });
  };

  // Wipe All Non-Admin Accounts
  const handleWipeAllAccounts = async () => {
    if (wipeConfirmInput.trim() !== 'WIPE ALL') {
      showToast('Verification mismatch. You must type "WIPE ALL" exactly.', 'error');
      return;
    }

    setWipeAccountsLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let deletedCount = 0;

      for (const d of usersSnap.docs) {
        const u = d.data() as UserProfile;
        const isProtectedAdmin = u.isMainAdmin || u.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase();

        if (!isProtectedAdmin) {
          await deleteDoc(doc(db, 'users', d.id));
          deletedCount++;
        }
      }

      setShowWipeAccountsModal(false);
      setWipeConfirmInput('');
      setSelectedUids([]);
      showToast(`WIPE COMPLETE: Permanently deleted ${deletedCount} non-admin user account(s).`, 'success');
    } catch (err: any) {
      console.error('Error wiping all accounts:', err);
      showToast(`Wipe accounts error: ${err.message}`, 'error');
    } finally {
      setWipeAccountsLoading(false);
    }
  };

  const handleToggleModerator = (targetUser: UserProfile) => {
    const newModStatus = !targetUser.isModerator;
    const actionText = newModStatus ? 'appoint as Moderator' : 'revoke Moderator authority from';

    setConfirmModal({
      isOpen: true,
      title: `${newModStatus ? 'Make' : 'Revoke'} Moderator`,
      message: `Are you sure you want to ${actionText} ${targetUser.fullName}?`,
      confirmText: newModStatus ? 'Confirm Make Mod' : 'Confirm Revoke Mod',
      isDanger: !newModStatus,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', targetUser.uid), {
            isModerator: newModStatus,
            isAdmin: newModStatus,
            updatedAt: serverTimestamp()
          });
          showToast(`${targetUser.fullName} is ${newModStatus ? 'now a Moderator' : 'no longer a Moderator'}.`, 'success');
        } catch (err: any) {
          console.error('Error toggling moderator status:', err);
          showToast(`Failed to update moderator status: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleTriggerPasswordReset = async (email: string) => {
    try {
      await resetPassword(email);
      showToast(`Password reset link successfully sent to ${email}`, 'success');
    } catch (err: any) {
      showToast(`Password reset error: ${err.message}`, 'error');
    }
  };

  // Stats calculation
  const totalUsersCount = users.length;
  const onlineUsersCount = users.filter((u) => u.status === 'online').length;
  const activeCount = users.filter((u) => u.accountStatus === 'active' || !u.accountStatus).length;
  const moderatorsCount = users.filter((u) => u.isModerator).length;
  const blockedCount = users.filter((u) => u.accountStatus === 'blocked').length;
  const deactivatedCount = users.filter((u) => u.accountStatus === 'deactivated').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbfaf6] text-black p-4 sm:p-6 overflow-y-auto font-mono">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#e2dfd2]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                <Shield className="w-5 h-5 text-black" />
                <span>ADMINISTRATOR CONTROL CONSOLE</span>
              </h2>
              {template.id === 'apple-glass' && (
                <span className="retro-badge-spectrum ml-2">
                  ADMIN CONSOLE
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Account activation, blocking, deactivation, selective deletion, and account wiping tools
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWipeAccountsModal(true)}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <AlertOctagon className="w-4 h-4 text-white" />
              <span>Wipe All Accounts</span>
            </button>
            <span className={`px-3 py-1 ${
              template.id === 'apple-glass' ? 'animate-spectrum-bg text-black font-black' : 'bg-black text-white font-extrabold'
            } text-xs font-mono rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
              {isMainAdmin ? 'Main Admin' : 'Moderator'}
            </span>
          </div>
        </div>

        {/* System Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Total Accounts</span>
              <Users className="w-3.5 h-3.5 text-black" />
            </div>
            <p className="text-2xl font-black text-black">{totalUsersCount}</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Active Online</span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 flex items-center gap-1.5">
              {onlineUsersCount}
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Active Accounts</span>
              <CheckCircle className="w-3.5 h-3.5 text-black" />
            </div>
            <p className="text-2xl font-black text-black">{activeCount}</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Blocked</span>
              <Ban className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-700">{blockedCount}</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Deactivated</span>
              <Power className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-700">{deactivatedCount}</p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#e2dfd2] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold">Moderators</span>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700">{moderatorsCount}</p>
          </div>
        </div>

        {/* Global Chat Message Data Wipe */}
        <div className="bg-white border border-[#e2dfd2] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2dfd2]">
            <div>
              <h3 className="text-sm font-bold text-black flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Global Chat Message Cleanup</span>
              </h3>
              <p className="text-xs text-zinc-600 mt-0.5">
                Immediately clear message text and attachments across all chats or configure a scheduled wipe.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleInstantWipe}
              disabled={wipeLoading}
              className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {wipeLoading ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-white" />
              )}
              <span>Wipe All Chat Messages Now</span>
            </button>
          </div>

          {wipeStatusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{wipeStatusMessage}</span>
              </div>
              <button onClick={() => setWipeStatusMessage(null)} className="text-emerald-700 hover:text-black">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="bg-[#f7f5ee] border border-[#d8d4c5] rounded-xl p-3.5 space-y-3">
              <label className="block text-xs font-bold text-black flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Schedule Message Wipe Date & Time</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={selectedDateTime}
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={(e) => handleSetSchedule(e)}
                  disabled={scheduleLoading || !selectedDateTime}
                  className="px-3 py-2 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  Set Schedule
                </button>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-medium block mb-1.5">Quick Presets:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 6, 24, 168].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => handleQuickPreset(hrs)}
                      className="px-2.5 py-1 bg-white border border-[#d8d4c5] hover:bg-black hover:text-white text-black text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      In {hrs === 168 ? '7 Days' : `${hrs} Hr${hrs > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#f7f5ee] border border-[#d8d4c5] rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-black flex items-center gap-1.5 mb-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Scheduled Wipe Status</span>
                </span>

                {systemSettings.scheduledMessageWipeAt ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Active Scheduled Wipe
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelSchedule}
                        className="text-[10px] text-amber-800 hover:text-black underline font-bold"
                      >
                        Cancel Wipe
                      </button>
                    </div>
                    <p className="text-xs text-amber-950 font-mono">
                      Target: {new Date(systemSettings.scheduledMessageWipeAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-[#d8d4c5] rounded-xl text-xs text-zinc-600 font-medium">
                    No automated chat wipe currently scheduled.
                  </div>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 border-t border-[#d8d4c5] pt-2 flex items-center justify-between">
                <span>Last Global Wipe:</span>
                <span className="font-mono text-black font-bold">
                  {systemSettings.lastWipedAt
                    ? new Date(systemSettings.lastWipedAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters, Search & Selected Batch Operations */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#e2dfd2] shadow-xs">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, email, or Friend Code..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white font-mono"
            />
            <Search className="w-4 h-4 text-white absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            {selectedUids.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedUids.length})</span>
              </button>
            )}

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['all', 'active', 'blocked', 'deactivated', 'online', 'moderators'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                    statusFilter === status
                      ? 'bg-black text-white'
                      : 'bg-[#f7f5ee] text-zinc-700 hover:text-black border border-[#d8d4c5]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-[#e2dfd2] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f5ee] border-b border-[#e2dfd2] text-zinc-700 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button onClick={handleSelectAll} className="cursor-pointer text-black">
                      {selectedUids.length > 0 && selectedUids.length === filteredUsers.length ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Friend Code</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Presence</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2dfd2]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <span className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent inline-block" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const status = u.accountStatus || 'active';
                    const isTargetMainAdmin = u.isMainAdmin || u.email?.toLowerCase() === PREDEFINED_ADMIN_EMAIL.toLowerCase();
                    const isMod = !!u.isModerator;
                    const isOnline = u.status === 'online';
                    const isSelected = selectedUids.includes(u.uid);

                    return (
                      <tr key={u.uid} className={`hover:bg-[#fbfaf6] transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          {!isTargetMainAdmin ? (
                            <button onClick={() => handleToggleSelectUser(u.uid)} className="cursor-pointer text-black">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-black" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.fullName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#d8d4c5]" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {u.fullName?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-black flex items-center gap-1.5">
                                {u.fullName}
                                {isTargetMainAdmin && <Award className="w-3.5 h-3.5 text-black" />}
                                {isMod && !isTargetMainAdmin && <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />}
                              </p>
                              <p className="text-[10px] text-zinc-500">@{u.username} • {u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-black">
                          {u.friendCode}
                        </td>

                        <td className="py-3 px-4">
                          {status === 'active' && (
                            <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-700" /> Active
                            </span>
                          )}
                          {status === 'blocked' && (
                            <span className="px-2 py-0.5 bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                              <Ban className="w-3 h-3 text-rose-700" /> Blocked
                            </span>
                          )}
                          {status === 'deactivated' && (
                            <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                              <Power className="w-3 h-3 text-amber-700" /> Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                            <span className="text-[11px] text-zinc-700 font-medium capitalize">
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium">
                          {isTargetMainAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black text-white">
                              Main Admin
                            </span>
                          ) : isMod ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              Moderator
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">Standard</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Password Reset */}
                            <button
                              onClick={() => handleTriggerPasswordReset(u.email)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-black hover:bg-zinc-100"
                              title="Send Password Reset Email"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Moderator Toggle */}
                            {isMainAdmin && !isTargetMainAdmin && (
                              <button
                                onClick={() => handleToggleModerator(u)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  isMod 
                                    ? 'bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-300' 
                                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'
                                }`}
                              >
                                {isMod ? 'Revoke Mod' : '+ Make Mod'}
                              </button>
                            )}

                            {/* Main Admin Account Protection */}
                            {isTargetMainAdmin ? (
                              <span className="text-[10px] text-zinc-400 font-mono italic px-2">Protected</span>
                            ) : (
                              <>
                                {/* Activate / Block / Deactivate buttons */}
                                {status !== 'active' && (
                                  <button
                                    onClick={() => handleUpdateStatus(u.uid, 'active', u.fullName)}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Activate Account"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Activate</span>
                                  </button>
                                )}

                                {status !== 'blocked' && (
                                  <button
                                    onClick={() => handleUpdateStatus(u.uid, 'blocked', u.fullName)}
                                    className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Block Account"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>Block</span>
                                  </button>
                                )}

                                {status !== 'deactivated' && (
                                  <button
                                    onClick={() => handleUpdateStatus(u.uid, 'deactivated', u.fullName)}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Deactivate Account"
                                  >
                                    <Power className="w-3 h-3" />
                                    <span>Deactivate</span>
                                  </button>
                                )}

                                {/* Delete Account */}
                                <button
                                  onClick={() => handleDeleteUser(u.uid, u.fullName)}
                                  className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  title="Permanently Delete Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Wipe All Accounts Confirmation Modal */}
      {showWipeAccountsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2dfd2] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertOctagon className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold text-black">WIPE ALL USER ACCOUNTS</h3>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              WARNING: This action will permanently delete <strong>ALL user accounts</strong> from TheRoom, except for the primary administrator account (<code>{PREDEFINED_ADMIN_EMAIL}</code>).
            </p>

            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-mono">
              To proceed, please type <strong>WIPE ALL</strong> below to confirm.
            </div>

            <input
              type="text"
              value={wipeConfirmInput}
              onChange={(e) => setWipeConfirmInput(e.target.value)}
              placeholder="Type WIPE ALL"
              className="w-full px-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black font-mono font-bold focus:outline-none focus:border-rose-700"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWipeAccountsModal(false);
                  setWipeConfirmInput('');
                }}
                disabled={wipeAccountsLoading}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeAllAccounts}
                disabled={wipeAccountsLoading || wipeConfirmInput.trim() !== 'WIPE ALL'}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                {wipeAccountsLoading ? (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Wipe All Accounts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg text-xs font-bold font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
            : toast.type === 'error'
            ? 'bg-rose-950 text-rose-200 border-rose-700'
            : 'bg-zinc-900 text-zinc-100 border-zinc-700'
        }`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-400 hover:text-white cursor-pointer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2dfd2] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2]">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-rose-600' : 'text-amber-600'}`} />
                <h3 className="text-sm font-bold text-black">{confirmModal.title}</h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="text-zinc-500 hover:text-black transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await fn();
                }}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-black hover:bg-zinc-800'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
