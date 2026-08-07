import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isMobileLockActive, setMobileBypass, isApkMode, isMobileDevice } from '../../lib/deviceUtils';
import { AndroidLockOverlay } from './AndroidLockOverlay';
import { DownloadApkModal } from '../download/DownloadApkModal';
import { useAuth } from '../../context/AuthContext';

export const MobileAppDownloadLock: React.FC = () => {
  const [locked, setLocked] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const location = useLocation();
  const { userProfile } = useAuth();

  const checkLockState = () => {
    // Never lock if in installed APK mode or if desktop browser
    if (isApkMode() || !isMobileDevice()) {
      setLocked(false);
      return;
    }

    if (isMobileLockActive()) {
      setLocked(true);
    } else {
      setLocked(false);
    }
  };

  // Re-check lock whenever route or userProfile state changes
  useEffect(() => {
    checkLockState();
  }, [location.pathname, userProfile?.uid]);

  // Handle window focus or storage updates
  useEffect(() => {
    const handleStorageChange = () => {
      checkLockState();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mobile_lock_reset', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mobile_lock_reset', handleStorageChange);
    };
  }, []);

  if (!locked) return null;

  return (
    <>
      <AndroidLockOverlay
        onBypass={() => {
          setMobileBypass(true);
          setLocked(false);
        }}
        onDownloadApk={() => {
          setShowApkModal(true);
        }}
      />

      <DownloadApkModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
      />
    </>
  );
};
