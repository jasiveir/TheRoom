import React, { useState } from 'react';
import { X, Search, UserPlus, Check, AlertCircle, Sparkles, Camera, QrCode } from 'lucide-react';
import { findUserByFriendCode, sendFriendRequest } from '../../lib/friendService';
import { useAuth } from '../../context/AuthContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';
import { UserProfile } from '../../types';
import { isApkMode } from '../../lib/deviceUtils';
import { CameraQRScannerModal } from '../qr/CameraQRScannerModal';
import { DeviceCameraPermissionModal } from '../qr/DeviceCameraPermissionModal';
import { UserQRCodeModal } from '../qr/UserQRCodeModal';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const { template } = useLayoutTemplate();
  const { userProfile } = useAuth();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searched, setSearched] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isDevicePermissionOpen, setIsDevicePermissionOpen] = useState(false);
  const [isUserQrOpen, setIsUserQrOpen] = useState(false);

  const isApp = isApkMode();

  if (!isOpen) return null;

  const handleOpenScanner = () => {
    const granted = localStorage.getItem('apk_camera_permission_allowed') === 'true';
    if (granted) {
      setIsCameraScannerOpen(true);
    } else {
      setIsDevicePermissionOpen(true);
    }
  };

  const handlePermissionAllowed = () => {
    setIsDevicePermissionOpen(false);
    setIsCameraScannerOpen(true);
  };

  const performSearchByCode = async (code: string) => {
    setError(null);
    setSearchResult(null);
    setRequestSent(false);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid Friend Code.');
      return;
    }

    setSearching(true);
    setSearched(true);

    try {
      const user = await findUserByFriendCode(cleanCode);
      if (!user) {
        setError('No user found with that Friend Code. Double-check the code with your friend.');
      } else if (user.uid === userProfile?.uid) {
        setError('This is your own Friend Code!');
      } else {
        setSearchResult(user);
      }
    } catch (err: any) {
      setError('Failed to search user. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearchByCode(friendCodeInput);
  };

  const handleQrScanned = (scannedCode: string) => {
    setFriendCodeInput(scannedCode);
    performSearchByCode(scannedCode);
  };

  const handleSendRequest = async () => {
    if (!userProfile || !searchResult) return;
    setRequestSending(true);
    setError(null);

    try {
      await sendFriendRequest(userProfile, searchResult);
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send friend request.');
    } finally {
      setRequestSending(false);
    }
  };

  const handleReset = () => {
    setFriendCodeInput('');
    setSearchResult(null);
    setSearched(false);
    setError(null);
    setRequestSent(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-950 text-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 overflow-hidden relative transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Add Friend</h2>
                {template.id === 'apple-glass' && (
                  <span className="retro-badge-spectrum">
                    ADD FRIEND
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Find real friends using their unique Friend Code</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick QR Code Action Buttons */}
        <div className={`grid ${isApp ? 'grid-cols-2' : 'grid-cols-1'} gap-2 my-3`}>
          {isApp && (
            <button
              type="button"
              onClick={handleOpenScanner}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-green-400 border-2 border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <Camera className="w-4 h-4 text-green-400" />
              <span>Scan Camera QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUserQrOpen(true)}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white border-2 border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>My QR Code</span>
          </button>
        </div>

        {/* Discovery Rules Banner */}

        <div className="my-4 p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-start gap-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5 text-white">Strict Privacy Protection</p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Users cannot be searched by name or email. You must enter their exact Friend Code received in person or via trusted channels.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Enter Friend Code
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5 pointer-events-none z-10" />
              <input
                type="text"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="e.g. PC-8F2X-LQ71 or ADMIN-0001"
                className={`w-full pl-9 pr-24 py-2.5 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-xs font-mono font-bold text-white uppercase tracking-wider placeholder:text-zinc-500 focus:outline-none ${
                  template.id === 'apple-glass' ? 'focus:animate-spectrum-border' : 'focus:border-white'
                } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
              />
              <button
                type="submit"
                disabled={searching || !friendCodeInput.trim()}
                className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 ${
                  template.id === 'apple-glass'
                    ? 'animate-spectrum-bg hover:opacity-90 font-black text-black'
                    : 'bg-white hover:bg-zinc-200 text-black font-extrabold'
                } disabled:opacity-50 text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transition-all cursor-pointer`}
              >
                {searching ? (
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className={`mt-3 p-3 ${template.bgMain} border ${template.borderMain} rounded-xl text-xs ${template.textSecondary} flex items-center gap-2 animate-in fade-in`}>
            <AlertCircle className={`w-4 h-4 ${template.textPrimary} shrink-0`} />
            <span>{error}</span>
          </div>
        )}

        {/* Search Result Card */}
        {searchResult && (
          <div className={`mt-4 p-4 ${template.bgMain} border ${template.borderMain} rounded-xl space-y-3 animate-in fade-in`}>
            <div className="flex items-center gap-3">
              {searchResult.photoURL ? (
                <img
                  src={searchResult.photoURL}
                  alt={searchResult.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full ${template.bgCard} flex items-center justify-center font-bold ${template.textPrimary} text-lg border ${template.borderMain}`}>
                  {searchResult.fullName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h3 className={`font-bold ${template.textPrimary} text-sm`}>
                  {searchResult.fullName}
                </h3>
                <p className={`text-xs ${template.textSecondary}`}>
                  @{searchResult.username}
                </p>
                <div className={`inline-block text-[10px] font-mono ${template.bgCard} border ${template.borderMain} px-1.5 py-0.5 rounded ${template.textSecondary} mt-0.5`}>
                  {searchResult.friendCode}
                </div>
              </div>
            </div>

            {searchResult.bio && (
              <p className={`text-xs ${template.textSecondary} italic ${template.bgCard} p-2.5 rounded-lg border ${template.borderMain}`}>
                "{searchResult.bio}"
              </p>
            )}

            <button
              onClick={handleSendRequest}
              disabled={requestSending || requestSent}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                requestSent
                  ? `${template.bgCard} ${template.textPrimary} border ${template.borderMain}`
                  : template.id === 'apple-glass'
                  ? 'animate-spectrum-bg text-black hover:opacity-90 font-black shadow-sm'
                  : 'bg-black hover:bg-zinc-800 text-white shadow-sm'
              }`}
            >
              {requestSending ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : requestSent ? (
                <>
                  <Check className={`w-4 h-4 ${template.textPrimary}`} />
                  <span>Friend Request Sent!</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Send Friend Request</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Device Camera Permission Modal (APK Mode) */}
      <DeviceCameraPermissionModal
        isOpen={isDevicePermissionOpen}
        onClose={() => setIsDevicePermissionOpen(false)}
        onAllow={handlePermissionAllowed}
      />

      {/* Camera QR Scanner Modal */}
      <CameraQRScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleQrScanned}
      />

      {/* User QR Code Generator Modal */}
      <UserQRCodeModal
        isOpen={isUserQrOpen}
        onClose={() => setIsUserQrOpen(false)}
      />
    </div>
  );
};

