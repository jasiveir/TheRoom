import React from 'react';
import { Camera, ShieldCheck, X } from 'lucide-react';
import logoImg from '../../assets/TheRoom.jpg';

interface DeviceCameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
}

export const DeviceCameraPermissionModal: React.FC<DeviceCameraPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllow,
}) => {
  if (!isOpen) return null;

  const handleGrant = () => {
    localStorage.setItem('apk_camera_permission_allowed', 'true');
    onAllow();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xs bg-zinc-900 text-white rounded-3xl border-2 border-zinc-700 shadow-2xl p-6 text-center relative overflow-hidden font-sans">
        {/* Android system app camera icon */}
        <div className="w-16 h-16 rounded-2xl bg-black border-2 border-green-500 flex items-center justify-center mx-auto mb-4 relative shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <img
            src={logoImg}
            onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }}
            alt="TheRoom"
            className="w-full h-full object-cover rounded-2xl opacity-80"
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-black">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        {/* System Permission Title */}
        <h3 className="text-base font-extrabold text-white mb-2 leading-snug">
          Allow "TheRoom" to take pictures and record video?
        </h3>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Required for scanning friend QR codes using your device's main camera.
        </p>

        {/* System Permission Options */}
        <div className="space-y-2">
          <button
            onClick={handleGrant}
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl border-2 border-black shadow-md transition-all cursor-pointer"
          >
            While using the app
          </button>

          <button
            onClick={handleGrant}
            className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-2xl border border-zinc-700 transition-all cursor-pointer"
          >
            Only this time
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white font-semibold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Don't allow
          </button>
        </div>
      </div>
    </div>
  );
};
