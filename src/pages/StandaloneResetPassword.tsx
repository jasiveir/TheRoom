import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, Send, CheckCircle, AlertCircle, KeyRound, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';
import { auth, db } from '../lib/firebase';
import { verifyPasswordResetCode } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const StandaloneResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, confirmPasswordResetWithCode, resetPasswordWithToken } = useAuth();

  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const rawTokenParam = searchParams.get('token') || '';
  const rawEmailParam = searchParams.get('email') || '';

  // Safely decode any multi-encoded URL parameters (e.g., %2540 -> %40 -> @)
  const decodeClean = (val: string) => {
    let result = val.trim();
    try {
      while (result.includes('%')) {
        const decoded = decodeURIComponent(result);
        if (decoded === result) break;
        result = decoded;
      }
    } catch (e) {
      // fallback
    }
    return result;
  };

  const tokenParam = decodeClean(rawTokenParam);
  const initialEmail = decodeClean(rawEmailParam);
  const activeCodeOrToken = tokenParam || oobCode;

  const [email, setEmail] = useState(initialEmail);
  const [resetTokenInput, setResetTokenInput] = useState(activeCodeOrToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const [tokenExpiredOrUsed, setTokenExpiredOrUsed] = useState(false);

  useEffect(() => {
    if (activeCodeOrToken) {
      setResetTokenInput(activeCodeOrToken);
    }
  }, [activeCodeOrToken]);

  // Check Firestore token status on mount to detect single-use link consumption
  useEffect(() => {
    const targetToken = tokenParam || resetTokenInput;
    if (!targetToken) return;

    const checkTokenOnMount = async () => {
      try {
        const snap = await getDoc(doc(db, 'passwordResets', targetToken));
        if (snap.exists()) {
          const data = snap.data();
          if (data.email && !email) {
            setEmail(data.email);
          }
          if (data.used) {
            setTokenExpiredOrUsed(true);
            setError('Try resetting your password again: This single-use reset key link has already been used or has expired.');
            return;
          }
          if (data.expiresAtMs && Date.now() > data.expiresAtMs) {
            setTokenExpiredOrUsed(true);
            setError('Try resetting your password again: Your request to reset your password has expired.');
            return;
          }
        } else {
          // Check resetRequests ticket
          const qReq = query(collection(db, 'resetRequests'), where('token', '==', targetToken));
          const qReqSnap = await getDocs(qReq);
          if (!qReqSnap.empty) {
            const rData = qReqSnap.docs[0].data();
            if (rData.email && !email) {
              setEmail(rData.email);
            }
            if (rData.status === 'completed' || rData.used) {
              setTokenExpiredOrUsed(true);
              setError('Try resetting your password again: This single-use reset key link has already been used or has expired.');
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Mount token status check notice:', e);
      }
    };

    checkTokenOnMount();
  }, [tokenParam, resetTokenInput]);

  // Attempt to extract email from oobCode if coming from Firebase reset link
  useEffect(() => {
    if (oobCode && !initialEmail) {
      verifyPasswordResetCode(auth, oobCode)
        .then((extractedEmail) => {
          if (extractedEmail) {
            setEmail(extractedEmail);
          }
        })
        .catch((err) => {
          console.warn('verifyPasswordResetCode notice:', err);
          setCodeNotice('Notice: The link code may have already been verified or opened. Enter your registered email and new password below to reset.');
        });
    }
  }, [oobCode, initialEmail]);

  // Handle resetting password using Active 1-Hour Token or Gmail oobCode
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);

    if (!email) {
      setError('Please enter your account email address.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const activeToken = resetTokenInput.trim() || activeCodeOrToken;

      if (tokenParam || activeToken.startsWith('rk_')) {
        await resetPasswordWithToken(email.trim().toLowerCase(), activeToken, newPassword);
      } else if (activeToken) {
        await confirmPasswordResetWithCode(activeToken, newPassword, email.trim().toLowerCase());
      } else {
        // Fallback token attempt with email
        await resetPasswordWithToken(email.trim().toLowerCase(), activeToken, newPassword);
      }
      setResetSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (email) {
        // Try fallback token reset
        try {
          await resetPasswordWithToken(email.trim().toLowerCase(), resetTokenInput.trim(), newPassword);
          setResetSuccess(true);
          return;
        } catch (fallbackErr) {
          // ignore
        }
      }

      if (err.code === 'auth/invalid-action-code') {
        setError('This reset link has expired or was already used. Please request a new reset key from Admin/Mod.');
      } else {
        setError(err.message || 'Could not reset password. Please verify your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Transmit reset email to Gmail
  const handleSendResetEmail = async () => {
    setError(null);
    setEmailSentSuccess(false);

    if (!email) {
      setError('Please enter your account email address above first.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      await resetPassword(cleanEmail);
      setEmailSentSuccess(true);
    } catch (err: any) {
      console.error('Send reset email error:', err);
      setError(err.message || 'Could not send reset email. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#fbfaf6] text-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden font-mono">
      <div className="w-full max-w-md bg-white border border-[#e2dfd2] rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        
        {/* Navigation back */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2]">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black font-semibold uppercase tracking-wider transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-zinc-100 text-zinc-700 border border-zinc-200 rounded">
            THE ROOM PORTAL
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl mx-auto overflow-hidden shadow-md">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-black uppercase tracking-wider">
            Reset Password
          </h1>
          <p className="text-xs text-zinc-500">
            Enter your Gmail/account email and set your new password
          </p>
        </div>

        {/* Success View */}
        {resetSuccess ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center space-y-4 animate-in fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <div>
              <h2 className="font-bold text-base uppercase tracking-wider text-emerald-900">Password Reset Complete!</h2>
              <p className="text-xs text-emerald-700 mt-1">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Sent Notice */}
            {emailSentSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password reset link sent to <strong>{email}</strong>! Check your Gmail inbox or Spam folder.</span>
              </div>
            )}

            {/* Code Notice */}
            {codeNotice && !error && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{codeNotice}</span>
              </div>
            )}

            {/* Password Reset Form - Streamlined (NO current password needed!) */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">
                  Account Email / Gmail Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                    required
                  />
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                    required
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-black"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                    required
                  />
                  <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Reset Key / Token Code (if provided or manual) */}
              {activeCodeOrToken && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                    Reset Token / Code
                  </label>
                  <input
                    type="text"
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-[11px] text-zinc-700 font-mono"
                  />
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                {tokenExpiredOrUsed ? (
                  <Link
                    to="/forgot-password"
                    className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                    <span>Request New Reset Key from Admin/Mod</span>
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || tokenExpiredOrUsed}
                    className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-white" />
                        <span>Update & Save New Password</span>
                      </>
                    )}
                  </button>
                )}

                <div className="text-center pt-2 border-t border-zinc-200">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-zinc-600 hover:text-black underline font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Reset Key from Admin / Mod</span>
                  </Link>
                </div>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};
