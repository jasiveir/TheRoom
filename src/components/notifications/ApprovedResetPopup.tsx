import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getDeviceId } from '../../lib/device';
import { KeyRound, ShieldCheck, X, Sparkles } from 'lucide-react';

interface ApprovedResetReq {
  id: string;
  email: string;
  token: string;
  resetLink?: string;
  deviceId?: string;
  status: string;
  used?: boolean;
}

export const ApprovedResetPopup: React.FC = () => {
  const [approvedReq, setApprovedReq] = useState<ApprovedResetReq | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentDeviceId = getDeviceId();
    if (!currentDeviceId) return;

    const q = query(
      collection(db, 'resetRequests'),
      where('deviceId', '==', currentDeviceId),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as ApprovedResetReq;
          const reqId = snapshot.docs[0].id;
          
          // Check if user dismissed this specific request in current session or if it's used
          const dismissed = sessionStorage.getItem('dismissed_reset_popup_' + reqId);
          if (!docData.used && !dismissed) {
            setApprovedReq({ ...docData, id: reqId });
          } else {
            setApprovedReq(null);
          }
        } else {
          setApprovedReq(null);
        }
      },
      (err) => {
        console.warn('Reset popup subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  if (!approvedReq) return null;

  const handleOpenReset = () => {
    if (!approvedReq) return;
    sessionStorage.setItem('dismissed_reset_popup_' + approvedReq.id, 'true');
    const targetUrl = `/reset-password?email=${encodeURIComponent(approvedReq.email)}&token=${approvedReq.token}`;
    setApprovedReq(null);
    navigate(targetUrl);
  };

  const handleDismiss = () => {
    if (!approvedReq) return;
    sessionStorage.setItem('dismissed_reset_popup_' + approvedReq.id, 'true');
    setApprovedReq(null);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-2xl relative font-mono text-black">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-zinc-400 hover:text-black transition-colors cursor-pointer p-1 rounded-full hover:bg-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Device Key Verified</span>
          </div>

          <h2 className="text-lg font-black tracking-tight text-zinc-900 uppercase">
            Reset Key Approved By Admin / Mod!
          </h2>

          <div className="bg-[#fbfaf6] border border-[#e2dfd2] p-3.5 rounded-2xl text-left text-xs space-y-1.5 leading-relaxed text-zinc-700">
            <p>
              <strong className="text-black">Target Email:</strong> {approvedReq.email}
            </p>
            <p className="text-[11px] text-zinc-600">
              Your password reset request sent from this device was approved. Click below to enter your new password now.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleOpenReset}
              className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Open Reset Password Screen Now</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 bg-transparent text-zinc-500 hover:text-black font-semibold text-xs transition-colors cursor-pointer"
            >
              Dismiss Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
