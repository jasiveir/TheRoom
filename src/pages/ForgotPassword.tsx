import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle, Shield, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';
import { getDeviceId } from '../lib/device';

const SAMPLE_PROMPTS = [
  'Imsorryforlosingmypasscodepleasegivemeresetkeymymasteradmin01',
  'DearAdminIhaveforgottensystempasscodekindlydispatchkeynow99',
  'Ipromisetoguardmypasscodebetterpleasegrantresetkeymaster07',
  'MasterAdminPleaseRestoreMyAccessKeyIWillBeCarefulNextTime88',
  'SystemAdministratorIRequestAnActiveResetTokenForMyAccount42',
  'PleaseVerifyMyIdentityAndGrantPasswordResetAccessAdmin303',
  'SecurityChallengeAcceptedPleaseIssueMyOneTimeResetToken777',
  'AdminAuthorizationRequiredForAccountPasscodeResetRequest12'
];

export const ForgotPassword: React.FC = () => {
  const { resetPassword, requestAdminResetKey, signInWithGoogle } = useAuth();
  
  // Default to 'admin' (REQUEST RESET KEY FROM ADMIN / MOD first)
  const [activeTab, setActiveTab] = useState<'admin' | 'email'>('admin');
  const [email, setEmail] = useState('');
  
  // Admin request states - pick a random challenge prompt on load
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * SAMPLE_PROMPTS.length));
  const challengePrompt = SAMPLE_PROMPTS[promptIndex];
  const [typedPrompt, setTypedPrompt] = useState('');
  const [adminRequestSuccess, setAdminRequestSuccess] = useState<{ token: string; resetLink: string; requestId: string; status: 'pending' | 'approved' } | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleNextPrompt = () => {
    setPromptIndex((prev) => {
      let next = Math.floor(Math.random() * SAMPLE_PROMPTS.length);
      if (next === prev) next = (prev + 1) % SAMPLE_PROMPTS.length;
      return next;
    });
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
      const deviceId = getDeviceId();
      const res = await requestAdminResetKey(email, typedPrompt, challengePrompt, deviceId);
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
    <div className="min-h-dvh w-full bg-[#fbfaf6] text-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden font-mono">
      <div className="w-full max-w-lg bg-white border border-[#e2dfd2] rounded-3xl p-6 sm:p-8 shadow-sm relative z-10">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-black transition-colors mb-4 uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Login</span>
        </Link>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl shadow-md mx-auto mb-3 overflow-hidden">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-wider uppercase">Reset Key Request</h1>
          <p className="text-xs text-zinc-600 font-medium mt-1 uppercase tracking-widest">// RECOVERY SIGNAL TRANSMISSION //</p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#fbfaf6] border border-[#e2dfd2] rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setError(null); }}
            className={`py-2.5 px-3 text-[11px] font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black bg-transparent'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Request From Admin/Mod</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(null); }}
            className={`py-2.5 px-3 text-[11px] font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black bg-transparent'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail Auto Reset</span>
          </button>
        </div>

        {/* Tab 1: Request Reset Key from Admin or Mod */}
        {activeTab === 'admin' && (
          <>
            {adminRequestSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl text-center space-y-3 animate-in fade-in shadow-xs">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-black text-sm uppercase tracking-wider text-emerald-950">
                  {adminRequestSuccess.status === 'approved' ? 'Reset Key Approved By Admin / Mod!' : 'Reset Request Transmitted To Admin / Mod!'}
                </h3>
                
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-left space-y-1.5 text-[11px] text-zinc-700">
                  <p><strong className="text-black">Target Email:</strong> {email}</p>
                  <p><strong className="text-black">Authorization Ticket ID:</strong> <code className="bg-zinc-100 px-1 py-0.5 rounded text-black font-bold">{adminRequestSuccess.requestId}</code></p>
                  <p>
                    <strong className="text-black">Status:</strong>{' '}
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                      adminRequestSuccess.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {adminRequestSuccess.status === 'approved' ? 'Approved & Key Active' : 'Awaiting Admin / Mod Review'}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-800 pt-1 font-medium">
                    ✨ <strong>Device Auto Pop-Up Active:</strong> {adminRequestSuccess.status === 'approved'
                      ? 'Your request was automatically approved! Click below or use the pop-up to reset.'
                      : 'Once an Admin or Moderator approves this request in their dashboard, a pop-up will appear directly on this device screen automatically.'}
                  </p>
                </div>

                {adminRequestSuccess.status === 'approved' && adminRequestSuccess.resetLink ? (
                  <div className="space-y-2 pt-2">
                    <Link
                      to={adminRequestSuccess.resetLink.replace(window.location.origin, '')}
                      className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Click to Open Single-Use Reset Screen</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(adminRequestSuccess.resetLink);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="w-full py-2 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 uppercase transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
                      <span>{copiedLink ? 'Reset Link Copied!' : 'Copy Direct Single-Use Reset Link'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminRequestSuccess(null);
                        setTypedPrompt('');
                      }}
                      className="w-full py-2.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Submit Another Request
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitAdminRequest} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                    Your Gmail / Account Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                      required
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Random Challenge Prompt Box */}
                <div className="p-3.5 bg-[#fbfaf6] border border-[#e2dfd2] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-black flex items-center gap-1">
                      <Shield className="w-3 h-3 text-black" />
                      <span>Security Challenge Phrase:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleNextPrompt}
                      className="text-[10px] text-zinc-600 hover:text-black underline flex items-center gap-1 cursor-pointer"
                      title="Generate new sentence prompt"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>New Sentence</span>
                    </button>
                  </div>

                  <div 
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-3 bg-white border border-[#d8d4c5] rounded-xl text-xs font-mono font-bold text-black select-none pointer-events-auto leading-relaxed select-none"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    {challengePrompt}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    * Type this exact sentence into the box below to transmit your request. (Copy & Paste disabled for security)
                  </p>
                </div>

                {/* Typed Prompt Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-black uppercase tracking-wider">
                      Type Authorization Sentence Exact
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isPromptMatched ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : typedPrompt ? 'bg-amber-100 text-amber-800' : 'text-zinc-400'
                    }`}>
                      {isPromptMatched ? '✓ Exact Match' : typedPrompt ? 'Typing sentence...' : 'Required'}
                    </span>
                  </div>

                  <textarea
                    value={typedPrompt}
                    onChange={(e) => setTypedPrompt(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setError('Copying & pasting is disabled for security verification. Please type the sentence manually.');
                    }}
                    onDrop={(e) => e.preventDefault()}
                    placeholder="Type the exact sentence shown above (Copy/Paste disabled)..."
                    rows={2}
                    className={`w-full p-2.5 bg-white border rounded-xl text-xs font-mono focus:outline-none transition-all ${
                      isPromptMatched
                        ? 'border-emerald-500 text-black shadow-xs'
                        : 'border-[#d8d4c5] text-black placeholder-zinc-400'
                    }`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPromptMatched}
                  className="w-full py-3 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-white font-bold" />
                      <span>Transmit Request to Admin / Mod</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Tab 2: Automated Gmail Reset */}
        {activeTab === 'email' && (
          <>
            <div className="mb-4 p-3 bg-[#fbfaf6] border border-[#e2dfd2] rounded-2xl text-[11px] text-zinc-700 leading-relaxed text-left space-y-1">
              <div className="font-bold text-black flex items-center gap-1.5 uppercase text-xs">
                <span>💡 Gmail Reset Key Transmit Notice:</span>
              </div>
              <p>
                Automated bot emails are transmitted directly to your Google Gmail inbox at <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer" className="underline text-black font-bold">mail.google.com</a>.
              </p>
            </div>

            {success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl text-center space-y-3 animate-in fade-in">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-950 uppercase tracking-wider">Reset Link Transmitted to Gmail!</p>
                
                <p className="text-zinc-700 leading-relaxed text-left bg-white p-3 rounded-xl border border-emerald-200">
                  <strong>Email requested for:</strong> <span className="text-black font-bold">{email}</span><br />
                  <span className="text-[11px] text-zinc-600 block mt-1">
                    ⚠️ Delivery note: Automated emails from Firebase <code className="bg-zinc-100 px-1 rounded text-black font-bold">noreply@...</code> may land in your Gmail <strong>Spam / Junk</strong> folder.
                  </span>
                </p>

                <div className="pt-3 border-t border-emerald-200 space-y-2">
                  <a
                    href="https://mail.google.com/mail/u/0/#search/TheRoom"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Mail className="w-4 h-4 text-black" />
                    <span>Open Gmail Inbox / Search</span>
                  </a>

                  <Link
                    to={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Reset Password Screen</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitEmail} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                    Gmail Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                      required
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer active:scale-98"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white font-bold" />
                      <span>Send Automated Reset Link to Gmail</span>
                    </>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e2dfd2]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-zinc-500 font-semibold">Or Direct Google Sign In</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-800 font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98 uppercase tracking-wider"
                >
                  {googleLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
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

        <div className="text-center pt-3 mt-4 border-t border-[#e2dfd2]">
          <p className="text-[10px] text-zinc-500 font-medium">
            🔒 Password resets are single-use & strictly require an active token issued upon Admin/Mod approval or official email verification.
          </p>
        </div>
      </div>
    </div>
  );
};
