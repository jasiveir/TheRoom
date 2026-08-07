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
  const { requestAdminResetKey } = useAuth();
  
  const [email, setEmail] = useState('');
  
  // Admin request states - pick a random challenge prompt on load
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * SAMPLE_PROMPTS.length));
  const challengePrompt = SAMPLE_PROMPTS[promptIndex];
  const [typedPrompt, setTypedPrompt] = useState('');
  const [adminRequestSuccess, setAdminRequestSuccess] = useState<{ token: string; resetLink: string; requestId: string; status: 'pending' | 'approved' } | null>(null);

  const [loading, setLoading] = useState(false);
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

  const handleSubmitAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdminRequestSuccess(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Account not identified. Password reset is only supported for valid Google email addresses (@gmail.com).');
      return;
    }

    if (typedPrompt.trim() !== challengePrompt.trim()) {
      setError('Random sentence prompt does not match. Please type the sentence exactly as shown.');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const res = await requestAdminResetKey(cleanEmail, typedPrompt, challengePrompt, deviceId);
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

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl shadow-md mx-auto mb-3 overflow-hidden">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-wider uppercase">Reset Key Request</h1>
          <p className="text-xs text-zinc-600 font-medium mt-1 uppercase tracking-widest">// RECOVERY SIGNAL TRANSMISSION //</p>
        </div>

        {/* Request Reset Key from Admin or Mod */}
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
                className="p-3 bg-white border border-[#d8d4c5] rounded-xl text-xs font-mono font-bold text-black select-none pointer-events-auto leading-relaxed"
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

        <div className="text-center pt-3 mt-4 border-t border-[#e2dfd2]">
          <p className="text-[10px] text-zinc-500 font-medium">
            🔒 Password resets are single-use & strictly require an active token issued upon Admin/Mod approval.
          </p>
        </div>
      </div>
    </div>
  );
};
