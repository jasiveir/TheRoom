import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle, Shield, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';

const SAMPLE_PROMPTS = [
  'Imsorryforlosingmypasscodepleasegivemeresetkeymymasteradmin01',
  'DearAdminIhaveforgottensystempasscodekindlydispatchkeynow99',
  'Ipromisetoguardmypasscodebetterpleasegrantresetkeymaster07',
  'MasterAdminPleaseRestoreMyAccessKeyIWillBeCarefulNextTime88',
  'SystemAdministratorIRequestAnActiveResetTokenForMyAccount42'
];

export const ForgotPassword: React.FC = () => {
  const { resetPassword, requestAdminResetKey, signInWithGoogle } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'email' | 'admin'>('email');
  const [email, setEmail] = useState('');
  
  // Admin request states
  const [promptIndex, setPromptIndex] = useState(0);
  const challengePrompt = SAMPLE_PROMPTS[promptIndex];
  const [typedPrompt, setTypedPrompt] = useState('');
  const [adminRequestSuccess, setAdminRequestSuccess] = useState<{ token: string; resetLink: string; requestId: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleNextPrompt = () => {
    setPromptIndex((prev) => (prev + 1) % SAMPLE_PROMPTS.length);
    setTypedPrompt('');
  };

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

  const handleSubmitEmail = async (e: React.FormEvent) => {
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

  const handleSubmitAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdminRequestSuccess(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (typedPrompt.trim() !== challengePrompt.trim()) {
      setError('Random sentence prompt does not match. Please type the sentence exactly as shown.');
      return;
    }

    setLoading(true);

    try {
      const res = await requestAdminResetKey(email, typedPrompt, challengePrompt);
      setAdminRequestSuccess(res);
    } catch (err: any) {
      console.error('Admin reset key request error:', err);
      setError(err.message || 'Failed to transmit reset request to Admin console.');
    } finally {
      setLoading(false);
    }
  };

  const isPromptMatched = typedPrompt.trim() === challengePrompt.trim();

  return (
    <div className="min-h-dvh w-full bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden">
      <div className="w-full max-w-lg bg-[#050505] border border-[#00ff41]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,255,65,0.15)] relative z-10 font-mono">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00ff41]/70 hover:text-[#00ff41] transition-colors mb-4 uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Link Console</span>
        </Link>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-black border border-[#00ff41]/60 flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(0,255,65,0.4)] mx-auto mb-3 overflow-hidden">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#00ff41] tracking-wider uppercase matrix-text-glow">Reset Key Console</h1>
          <p className="text-xs text-[#00ff41]/70 mt-1 uppercase tracking-widest">// RECOVERY SIGNAL TRANSMISSION // </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black border border-[#00ff41]/30 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(null); }}
            className={`py-2 px-3 text-[11px] font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[#00ff41] text-black shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                : 'text-[#00ff41]/70 hover:text-[#00ff41] bg-transparent'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail Auto Reset</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setError(null); }}
            className={`py-2 px-3 text-[11px] font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#00ff41] text-black shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                : 'text-[#00ff41]/70 hover:text-[#00ff41] bg-transparent'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Request Key From Admin</span>
          </button>
        </div>

        {/* Tab 1: Automated Gmail Reset */}
        {activeTab === 'email' && (
          <>
            <div className="mb-4 p-3 bg-black border border-[#00ff41]/40 rounded-2xl text-[11px] text-[#00ff41]/90 leading-relaxed text-left space-y-1 font-mono">
              <div className="font-bold text-white flex items-center gap-1.5 uppercase text-xs text-[#00ff41]">
                <span>💡 Gmail Reset Key Transmit Notice:</span>
              </div>
              <p>
                Automated bot emails are transmitted directly to your Google Gmail inbox at <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer" className="underline text-white font-bold">mail.google.com</a>. Active reset links remain valid for 1 hour.
              </p>
            </div>

            {success ? (
              <div className="p-4 bg-[#111111] border border-[#00ff41]/50 text-[#00ff41] text-xs rounded-2xl text-center space-y-3 animate-in fade-in">
                <CheckCircle className="w-8 h-8 text-[#00ff41] mx-auto shadow-[0_0_10px_#00ff41]" />
                <p className="font-bold text-sm text-[#00ff41] uppercase tracking-wider">1-Hour Active Reset Key Transmitted!</p>
                
                <p className="text-[#00ff41]/90 leading-relaxed text-left bg-black/60 p-3 rounded-xl border border-[#00ff41]/30">
                  <strong>Email requested for:</strong> <span className="text-white">{email}</span><br />
                  <span className="text-[11px] text-[#00ff41]/80 block mt-1">
                    ⚠️ <strong>Note on Gmail Delivery:</strong> Automated emails from Firebase <code className="bg-zinc-900 px-1 rounded text-white">noreply@...</code> frequently land in your Gmail <strong>Spam / Junk</strong> folder or <strong>Promotions</strong> tab. Your active reset token will stay valid for 1 full hour.
                  </span>
                </p>

                <div className="space-y-2 pt-1 text-left">
                  <p className="text-[11px] font-bold text-[#00ff41] uppercase">Troubleshooting Checklist:</p>
                  <ul className="text-[11px] text-[#00ff41]/80 space-y-1 list-disc list-inside">
                    <li>Check Gmail <a href="https://mail.google.com/mail/u/0/#spam" target="_blank" rel="noopener noreferrer" className="underline text-white font-bold">Spam Folder</a></li>
                    <li>Search Gmail for: <code className="bg-zinc-900 px-1 rounded text-white">in:anywhere TheRoom</code></li>
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
                    <span>Proceed to Active Reset Key Console</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitEmail} className="space-y-4">
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
                      <span>Send 1-Hour Active Reset Key to Gmail</span>
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
              </form>
            )}
          </>
        )}

        {/* Tab 2: Request Reset Key from Admin or Mod */}
        {activeTab === 'admin' && (
          <>
            {adminRequestSuccess ? (
              <div className="p-4 bg-[#111111] border border-[#00ff41] text-[#00ff41] text-xs rounded-2xl text-center space-y-3 animate-in fade-in shadow-[0_0_20px_rgba(0,255,65,0.2)]">
                <CheckCircle className="w-10 h-10 text-[#00ff41] mx-auto shadow-[0_0_12px_#00ff41]" />
                <h3 className="font-black text-sm uppercase tracking-wider text-[#00ff41]">Reset Request Transmitted To Admin!</h3>
                
                <div className="bg-black/80 p-3.5 rounded-xl border border-[#00ff41]/40 text-left space-y-1.5 text-[11px]">
                  <p><strong>Target Email:</strong> <span className="text-white">{email}</span></p>
                  <p><strong>Authorization Ticket ID:</strong> <code className="bg-zinc-900 px-1 rounded text-[#00ff41]">{adminRequestSuccess.requestId}</code></p>
                  <p><strong>Status:</strong> <span className="px-2 py-0.5 bg-[#00ff41]/20 text-[#00ff41] rounded border border-[#00ff41]/40 font-bold uppercase text-[9px]">Logged in Admin Console</span></p>
                  <p className="text-[10px] text-[#00ff41]/70 pt-1">
                    Your authorization sentence was verified! An active 1-hour reset key token has been issued for your account.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    to={adminRequestSuccess.resetLink.replace(window.location.origin, '')}
                    className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-black" />
                    <span>Click to Use Active 1-Hour Reset Key Now</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adminRequestSuccess.resetLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="w-full py-2 bg-black hover:bg-zinc-900 border border-[#00ff41]/50 text-[#00ff41] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 uppercase transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5 text-[#00ff41]" />}
                    <span>{copiedLink ? 'Reset Link Copied!' : 'Copy Direct Active Reset Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAdminRequest} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-[#111111] border border-rose-500/50 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#00ff41] mb-1 uppercase tracking-wider">
                    Your Gmail / Account Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/30 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41]"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Random Challenge Prompt Box */}
                <div className="p-3.5 bg-black border border-[#00ff41]/60 rounded-2xl space-y-2 shadow-[0_0_15px_rgba(0,255,65,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#00ff41] flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#00ff41]" />
                      <span>Security Challenge Phrase:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleNextPrompt}
                      className="text-[10px] text-[#00ff41]/80 hover:text-[#00ff41] underline flex items-center gap-1 cursor-pointer"
                      title="Generate new sentence prompt"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>New Sentence</span>
                    </button>
                  </div>

                  <div className="p-3 bg-[#111111] border border-[#00ff41]/40 rounded-xl text-xs font-mono font-bold text-[#00ff41] select-all break-all leading-relaxed shadow-inner">
                    {challengePrompt}
                  </div>
                  <p className="text-[10px] text-[#00ff41]/70">
                    * Type this exact sentence into the authorization box below to transmit your request to the Admin & Moderator console.
                  </p>
                </div>

                {/* Typed Prompt Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#00ff41] uppercase tracking-wider">
                      Type Authorization Sentence Exact
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isPromptMatched ? 'bg-[#00ff41] text-black' : typedPrompt ? 'bg-amber-500/20 text-amber-400' : 'text-[#00ff41]/50'
                    }`}>
                      {isPromptMatched ? '✓ Match Exact' : typedPrompt ? 'Typing sentence...' : 'Required'}
                    </span>
                  </div>

                  <textarea
                    value={typedPrompt}
                    onChange={(e) => setTypedPrompt(e.target.value)}
                    placeholder="Type the exact sentence shown above..."
                    rows={2}
                    className={`w-full p-2.5 bg-[#111111] border rounded-xl text-xs font-mono focus:outline-none transition-all ${
                      isPromptMatched
                        ? 'border-[#00ff41] text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                        : 'border-[#00ff41]/30 text-[#00ff41] placeholder-[#00ff41]/40'
                    }`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPromptMatched}
                  className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] disabled:opacity-40 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.4)] flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-black font-bold" />
                      <span>Transmit Request to Admin / Mod Console</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        <div className="text-center pt-3 mt-4 border-t border-[#00ff41]/20">
          <Link
            to={email ? `/reset-password?email=${encodeURIComponent(email)}` : '/reset-password'}
            className="text-xs text-[#00ff41]/80 hover:text-[#00ff41] underline inline-flex items-center gap-1"
          >
            <span>Or recalibrate password instantly using current password &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

