import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { UserProfile } from '../../types';
import { checkIsFriend } from '../../lib/friendService';
import { createGroupChat } from '../../lib/chatService';
import { X, Users, UserCheck, AlertTriangle, Image as ImageIcon, Plus, Upload, Sparkles, Check } from 'lucide-react';

const PRESET_GALLERY_IMAGES = [
  { name: 'Lounge', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80' },
  { name: 'Tech', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&auto=format&fit=crop&q=80' },
  { name: 'Gaming', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80' },
  { name: 'Cyber', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80' },
  { name: 'Coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80' },
  { name: 'Friends', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=80' },
  { name: 'Music', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' },
  { name: 'Party', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80' },
];

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { template } = useLayoutTemplate();
  const { userProfile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [description, setDescription] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showNonFriendsWarning, setShowNonFriendsWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groupFileInputRef = useRef<HTMLInputElement>(null);

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoURL(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          setPhotoURL(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Fetch current user's friends list
  useEffect(() => {
    if (!isOpen || !userProfile?.uid) return;

    setLoadingFriends(true);
    const fetchFriends = async () => {
      try {
        const f1Query = query(collection(db, 'friendships'), where('users', 'array-contains', userProfile.uid));
        const fSnap = await getDocs(f1Query);
        const friendUids: string[] = [];

        fSnap.docs.forEach((docSnap) => {
          const uArray = docSnap.data().users as string[];
          const other = uArray.find((id) => id !== userProfile.uid);
          if (other) friendUids.push(other);
        });

        if (friendUids.length === 0) {
          setFriends([]);
          setLoadingFriends(false);
          return;
        }

        const profiles: UserProfile[] = [];
        for (const fUid of friendUids) {
          const uDoc = await getDoc(doc(db, 'users', fUid));
          if (uDoc.exists()) {
            profiles.push({ uid: uDoc.id, ...uDoc.data() } as UserProfile);
          }
        }

        // Sort alphabetically
        profiles.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setFriends(profiles);
      } catch (err) {
        console.error('Error fetching friends for group modal:', err);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isOpen, userProfile?.uid]);

  if (!isOpen) return null;

  const toggleFriendSelection = (uid: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleValidateAndSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!groupName.trim()) {
      setError('Please provide a Group Name.');
      return;
    }

    if (selectedFriendIds.length === 0) {
      setError('Please select at least one friend to add to the group.');
      return;
    }

    setLoading(true);

    try {
      const selectedFriends = friends.filter((f) => selectedFriendIds.includes(f.uid));

      // Check if every selected member is friends with every other selected member
      let allAreFriends = true;
      for (let i = 0; i < selectedFriends.length; i++) {
        for (let j = i + 1; j < selectedFriends.length; j++) {
          const isF = await checkIsFriend(selectedFriends[i].uid, selectedFriends[j].uid);
          if (!isF) {
            allAreFriends = false;
            break;
          }
        }
        if (!allAreFriends) break;
      }

      if (!allAreFriends && !showNonFriendsWarning) {
        setLoading(false);
        setShowNonFriendsWarning(true);
        return;
      }

      // Execute Group Creation
      if (!userProfile) return;
      const groupId = await createGroupChat(
        userProfile,
        selectedFriends,
        groupName.trim(),
        photoURL.trim(),
        description.trim()
      );

      onGroupCreated(groupId);
      handleClose();
    } catch (err: any) {
      console.error('Group creation error:', err);
      setError(err.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setPhotoURL('');
    setDescription('');
    setSelectedFriendIds([]);
    setShowNonFriendsWarning(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 overflow-hidden relative transition-colors max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">Create Group Chat</h2>
              {template.id === 'apple-glass' && (
                <span className="retro-badge-spectrum ml-1">
                  NEW GROUP
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-black border border-zinc-800 rounded-xl text-xs text-zinc-300">
              {error}
            </div>
          )}

          {/* Group Info Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Weekend Crew, Book Club"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                <span>Group Picture (Optional)</span>
                <span className="text-[10px] text-zinc-500 font-normal">Gallery & Presets</span>
              </label>

              {/* Selected Picture Preview */}
              {photoURL ? (
                <div className="mb-2 p-2 bg-black border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={photoURL}
                      alt="Group Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">Picture Selected</p>
                      <p className="text-[10px] text-zinc-400">Ready for group creation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoURL('')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Remove Picture"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}

              {/* Action Buttons for Gallery / Preset */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="file"
                  ref={groupFileInputRef}
                  accept="image/*"
                  onChange={handleDeviceFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => groupFileInputRef.current?.click()}
                  className="px-3 py-2 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Device Gallery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className={`px-3 py-2 bg-black border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    showPresets ? 'border-emerald-500 text-emerald-300' : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>App Presets</span>
                </button>
              </div>

              {/* App Preset Gallery Grid */}
              {showPresets && (
                <div className="p-2 bg-black border border-zinc-800 rounded-xl mb-2 animate-in fade-in">
                  <p className="text-[10px] text-zinc-400 mb-2 font-mono uppercase tracking-wider">
                    Select App Gallery Picture:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_GALLERY_IMAGES.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setPhotoURL(item.url);
                          setShowPresets(false);
                        }}
                        className={`relative rounded-lg overflow-hidden border transition-all cursor-pointer aspect-square ${
                          photoURL === item.url ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center py-0.5 truncate font-mono">
                          {item.name}
                        </span>
                        {photoURL === item.url && (
                          <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct URL Input */}
              <div className="relative">
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="w-full pl-8 pr-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
                <ImageIcon className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief group description..."
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Select Friends List */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Select Friends ({selectedFriendIds.length} selected)
            </label>

            {loadingFriends ? (
              <div className="py-6 text-center">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent inline-block" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-zinc-400 bg-black p-3 rounded-xl border border-zinc-800 text-center">
                You haven't added any friends yet. Add friends using their Friend Code first!
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-zinc-800 rounded-xl p-2 bg-black">
                {friends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.uid);
                  return (
                    <div
                      key={friend.uid}
                      onClick={() => toggleFriendSelection(friend.uid)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-zinc-900 border border-zinc-700'
                          : 'hover:bg-zinc-900/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700">
                            {friend.fullName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">
                            {friend.fullName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-white border-white text-black'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}>
                        {isSelected && <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Warning Modal Overlay if selected members are not mutual friends */}
        {showNonFriendsWarning && (
          <div className="absolute inset-0 bg-black/95 z-20 p-6 flex flex-col justify-center animate-in fade-in">
            <div className="text-white mb-3 flex justify-center">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-bold text-white text-sm text-center mb-2">
              Group Friendship Status
            </h3>
            <p className="text-xs text-zinc-300 text-center leading-relaxed mb-6 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              Some members in this group are not friends with one another. They will still be able to communicate within this shared group. Do you want to continue?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNonFriendsWarning(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl border border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleValidateAndSubmit()}
                className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showNonFriendsWarning && (
          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleValidateAndSubmit()}
              disabled={loading || selectedFriendIds.length === 0 || !groupName.trim()}
              className="px-5 py-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
