import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';

export const ForgotPassword: React.FC = () => {
  const { resetPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Account not identified. Password reset is only supported for valid Google email addresses (@gmail.com).');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(cleanEmail);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Could not send reset email. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden">
      <div className="w-full max-w-md bg-[#050505] border border-[#00ff41]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,255,65,0.15)] relative z-10 font-mono">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00ff41]/70 hover:text-[#00ff41] transition-colors mb-6 uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Link Console</span>
        </Link>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black border border-[#00ff41]/60 flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(0,255,65,0.4)] mx-auto mb-3 overflow-hidden">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#00ff41] tracking-wider uppercase matrix-text-glow">Reset Key</h1>
          <p className="text-xs text-[#00ff41]/70 mt-1 uppercase tracking-widest">// RECOVERY INSTRUCTIONS TRANSMISSION //</p>
        </div>

        {success ? (
          <div className="p-4 bg-[#111111] border border-[#00ff41]/50 text-[#00ff41] text-xs rounded-2xl text-center space-y-3 animate-in fade-in">
            <CheckCircle className="w-8 h-8 text-[#00ff41] mx-auto shadow-[0_0_10px_#00ff41]" />
            <p className="font-bold text-sm text-[#00ff41] uppercase tracking-wider">Reset Signal Transmitted!</p>
            
            <p className="text-[#00ff41]/90 leading-relaxed text-left bg-black/60 p-3 rounded-xl border border-[#00ff41]/30">
              <strong>Email requested for:</strong> <span className="text-white">{email}</span><br />
              <span className="text-[11px] text-[#00ff41]/80 block mt-1">
                ⚠️ <strong>Note on Gmail Delivery:</strong> Automated emails from Firebase <code className="bg-zinc-900 px-1 rounded text-white">noreply@...</code> frequently land in your Gmail <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab.
              </span>
            </p>

            <div className="space-y-2 pt-1 text-left">
              <p className="text-[11px] font-bold text-[#00ff41] uppercase">Quick Troubleshooting Checklist:</p>
              <ul className="text-[11px] text-[#00ff41]/80 space-y-1 list-disc list-inside">
                <li>Check Gmail <a href="https://mail.google.com/mail/u/0/#spam" target="_blank" rel="noopener noreferrer" className="underline text-white font-bold">Spam Folder</a></li>
                <li>Search Gmail for: <code className="bg-zinc-900 px-1 rounded text-white">in:anywhere TheRoom</code></li>
                <li>Allow 1-2 minutes for Google Mail server queue</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#00ff41]/30 space-y-2">
              <a
                href="https://mail.google.com/mail/u/0/#search/TheRoom"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-black hover:bg-zinc-900 border border-[#00ff41]/60 text-[#00ff41] font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4 text-[#00ff41]" />
                <span>Open Gmail Inbox / Search</span>
              </a>

              <Link
                to={`/reset-password?email=${encodeURIComponent(email)}`}
                className="w-full py-2.5 bg-[#00ff41] hover:bg-[#39ff14] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_12px_rgba(0,255,65,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <span>Instant Reset Console (No Email Wait)</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-[#111111] border border-rose-500/50 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#00ff41] mb-1.5 uppercase tracking-wider">
                Gmail Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/30 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41] matrix-border-glow"
                  required
                />
                <Mail className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.4)] flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer active:scale-98"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Send className="w-4 h-4 text-black font-bold" />
                  <span>Send Reset Email to Gmail</span>
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#00ff41]/20"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-black px-2 text-[#00ff41]/70 font-semibold">Or Bypass Email & Sign In Direct</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 bg-[#111111] hover:bg-zinc-900 border border-[#00ff41]/50 rounded-xl text-xs text-[#00ff41] font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98 uppercase tracking-wider"
            >
              {googleLoading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#00ff41] border-t-transparent" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>1-Click Google Account Sign In</span>
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-[#00ff41]/20">
              <Link
                to={email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'}
                className="text-xs text-[#00ff41]/80 hover:text-[#00ff41] underline inline-flex items-center gap-1"
              >
                <span>Or recalibrate password instantly using current password &rarr;</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
