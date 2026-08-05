import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, Send, CheckCircle, AlertCircle, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, updatePassword as firebaseUpdatePassword } from 'firebase/auth';

export const StandaloneResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, confirmPasswordResetWithCode, resetPasswordWithToken } = useAuth();

  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const tokenParam = searchParams.get('token') || '';
  const activeCodeOrToken = tokenParam || oobCode;
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [resetTokenInput, setResetTokenInput] = useState(activeCodeOrToken);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'code' | 'reauth'>(activeCodeOrToken ? 'code' : 'reauth');

  useEffect(() => {
    if (activeCodeOrToken) {
      setMode('code');
      setResetTokenInput(activeCodeOrToken);
    }
  }, [activeCodeOrToken]);

  // Handle resetting password using Active 1-Hour Token or Gmail oobCode
  const handleCodeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);

    const activeToken = resetTokenInput.trim() || activeCodeOrToken;

    if (!activeToken) {
      setError('Invalid or missing password reset key code. Please request a reset key email or ask an admin.');
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
      if (tokenParam || activeToken.startsWith('rk_')) {
        await resetPasswordWithToken(email, activeToken, newPassword);
      } else {
        await confirmPasswordResetWithCode(activeToken, newPassword, email);
      }
      setResetSuccess(true);
    } catch (err: any) {
      console.error('Confirm password reset error:', err);
      // Fallback attempt: if code didn't work directly, try token verification for email
      if (email) {
        try {
          await resetPasswordWithToken(email, activeToken, newPassword);
          setResetSuccess(true);
          return;
        } catch (fallbackErr) {
          // ignore
        }
      }

      if (err.code === 'auth/invalid-action-code') {
        setError('The password reset link has expired or has already been used. Active 1-hour keys are available via the "Request Reset Key from Admin" tab.');
      } else {
        setError(err.message || 'Could not reset password. Please verify your reset link or email.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle direct reset by authenticating current password + setting new password
  const handleReauthReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!oldPassword) {
      setError('Please enter your current/old password for account verification.');
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
      // 1. Authenticate user with current email & old password
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), oldPassword);
      
      // 2. Update password
      if (userCredential.user) {
        await firebaseUpdatePassword(userCredential.user, newPassword);
        setResetSuccess(true);
      } else {
        throw new Error('Authentication failed.');
      }
    } catch (err: any) {
      console.error('Re-authentication reset error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect current password. Please verify your old password and try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else {
        setError(err.message || 'Password reset failed. Please check your credentials.');
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
      setError('Please enter your Gmail address first.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Reset key emails are only supported for valid Google Gmail addresses (@gmail.com).');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(cleanEmail);
      setEmailSentSuccess(true);
    } catch (err: any) {
      console.error('Send reset email error:', err);
      setError(err.message || 'Could not send reset email. Please check your address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden font-mono">
      {/* Background Matrix Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00ff41]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#050505] border-2 border-[#00ff41]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,255,65,0.2)] relative z-10 space-y-6">
        
        {/* Navigation back */}
        <div className="flex items-center justify-between pb-3 border-b border-[#00ff41]/30">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00ff41]/80 hover:text-[#00ff41] transition-colors uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </Link>
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40 rounded">
            STANDALONE RESET CONSOLE
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-black border border-[#00ff41]/80 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.5)] mx-auto overflow-hidden">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-[#00ff41] uppercase tracking-wider matrix-text-glow">
            Recalibrate Reset Key
          </h1>
          <p className="text-xs text-[#00ff41]/70 uppercase tracking-widest">
            // Dedicated Password Reset Portal //
          </p>
        </div>

        {/* Success View */}
        {resetSuccess ? (
          <div className="p-6 bg-[#111111] border-2 border-[#00ff41] text-[#00ff41] rounded-2xl text-center space-y-4 animate-in fade-in shadow-[0_0_25px_rgba(0,255,65,0.3)]">
            <CheckCircle className="w-12 h-12 text-[#00ff41] mx-auto animate-bounce" />
            <div>
              <h2 className="font-extrabold text-base uppercase tracking-wider text-[#00ff41]">Password Successfully Reset!</h2>
              <p className="text-xs text-[#00ff41]/80 mt-1">
                Your account access key has been updated. You can now sign in with your new password.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all cursor-pointer"
            >
              Proceed to Account Login
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-[#111111] border border-rose-500/60 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Sent Notice */}
            {emailSentSuccess && (
              <div className="p-3.5 bg-[#111111] border border-[#00ff41]/60 text-[#00ff41] text-xs rounded-2xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#00ff41] shrink-0" />
                <span>Reset key email sent to <strong>{email}</strong>! Check your Gmail inbox or Spam folder.</span>
              </div>
            )}

            {/* Reset Form based on Mode */}
            {mode === 'code' ? (
              <form onSubmit={handleCodeReset} className="space-y-4">
                <div className="p-3 bg-[#111111] border border-[#00ff41]/30 rounded-xl text-[11px] text-[#00ff41]/80">
                  <span className="font-bold text-[#00ff41] block mb-0.5">1-Hour Active Reset Key Detected</span>
                  Enter your registered account email and new password to complete account recalibration.
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                    Target Gmail / Account Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Lock className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-[#00ff41]/50 hover:text-[#00ff41]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Lock className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-black" />
                      <span>Update Password Now</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReauthReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                    Gmail Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#00ff41] uppercase tracking-wider">
                      Current / Old Password
                    </label>
                    <span className="text-[10px] text-[#00ff41]/60">Required authentication</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Your current active password"
                      className="w-full pl-9 pr-10 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Lock className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-3 text-[#00ff41]/50 hover:text-[#00ff41]"
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-8 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                        required
                      />
                      <ShieldCheck className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-3 text-[#00ff41]/50 hover:text-[#00ff41]"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#00ff41] mb-1 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                        required
                      />
                      <Lock className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-black" />
                        <span>Authenticate & Reset Password</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={loading || !email}
                      className="text-xs text-[#00ff41]/80 hover:text-[#00ff41] underline flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send No-Reply Reset Email to Gmail</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
