import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, Download, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoutTemplate } from '../../context/LayoutTemplateContext';

interface UserQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserQRCodeModal: React.FC<UserQRCodeModalProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const { template } = useLayoutTemplate();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    if (isOpen && userProfile?.friendCode) {
      setGenerating(true);
      // Generate QR Code containing the Friend Code
      const payload = userProfile.friendCode;
      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        })
        .finally(() => {
          setGenerating(false);
        });
    }
  }, [isOpen, userProfile?.friendCode]);

  if (!isOpen || !userProfile) return null;

  const handleCopyCode = () => {
    if (userProfile.friendCode) {
      navigator.clipboard.writeText(userProfile.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `TheRoom-QRCode-${userProfile.username}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-zinc-950 text-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 p-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-black border-2 border-zinc-700 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Your Friend QR Code</h2>
            <p className="text-xs text-zinc-400">Scan using APK camera to add instantly</p>
          </div>
        </div>

        {/* User Card Header */}
        <div className="flex items-center gap-3 p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {userProfile.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.fullName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white">
              {userProfile.fullName[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white truncate">{userProfile.fullName}</h3>
            <p className="text-xs text-zinc-400 truncate">@{userProfile.username}</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative my-2">
          {generating ? (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-800">
              <span className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent" />
            </div>
          ) : (
            <img src={qrDataUrl} alt="Friend QR Code" className="w-52 h-52 object-contain" />
          )}
          <div className="mt-2 text-[11px] font-mono font-black text-black bg-zinc-100 px-3 py-1 rounded-md border border-zinc-300 tracking-wider uppercase">
            {userProfile.friendCode}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={handleCopyCode}
            className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold border-2 border-zinc-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadQR}
            className="py-2.5 px-3 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-black border-2 border-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Download className="w-4 h-4" />
            <span>Save Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
