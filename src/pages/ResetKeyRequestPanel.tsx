import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLayoutTemplate } from '../context/LayoutTemplateContext';
import { KeyRound, Shield, RefreshCw, Send, CheckCircle, AlertCircle, Copy, Check, Clock } from 'lucide-react';

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

interface UserResetRequestDoc {
  id: string;
  email: string;
  prompt: string;
  token: string;
  resetLink: string;
  status: 'pending' | 'approved' | 'completed' | 'dismissed';
  requestedAtMs: number;
  expiresAtMs: number;
  createdAt?: any;
}

export const ResetKeyRequestPanel: React.FC = () => {
  const { userProfile, requestAdminResetKey } = useAuth();
  const { template } = useLayoutTemplate();

  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * SAMPLE_PROMPTS.length));
  const challengePrompt = SAMPLE_PROMPTS[promptIndex];
  const [typedPrompt, setTypedPrompt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedReq, setLastSubmittedReq] = useState<{ token: string; resetLink: string; requestId: string; status: 'pending' | 'approved' } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [myTickets, setMyTickets] = useState<UserResetRequestDoc[]>([]);

  const handleNextPrompt = () => {
    setPromptIndex((prev) => {
      let next = Math.floor(Math.random() * SAMPLE_PROMPTS.length);
      if (next === prev) next = (prev + 1) % SAMPLE_PROMPTS.length;
      return next;
    });
    setTypedPrompt('');
  };

  useEffect(() => {
    if (!userProfile?.email) return;

    const q = query(
      collection(db, 'resetRequests'),
      where('email', '==', userProfile.email.trim().toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserResetRequestDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserResetRequestDoc, 'id'>)
      }));
      list.sort((a, b) => (b.requestedAtMs || 0) - (a.requestedAtMs || 0));
      setMyTickets(list);
    }, (err) => {
      console.warn('Error listening to my resetRequests:', err);
    });

    return () => unsubscribe();
  }, [userProfile?.email]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastSubmittedReq(null);

    const email = userProfile?.email || '';
    if (!email) {
      setError('User profile email address not detected.');
      return;
    }

    if (typedPrompt.trim() !== challengePrompt.trim()) {
      setError('Random sentence prompt does not match. Please re-type the sentence exactly as shown.');
      return;
    }

    setLoading(true);

    try {
      const res = await requestAdminResetKey(email, typedPrompt, challengePrompt);
      setLastSubmittedReq(res);
      setTypedPrompt('');
    } catch (err: any) {
      console.error('Submit reset key request error:', err);
      setError(err.message || 'Failed to submit request to Admin console.');
    } finally {
      setLoading(false);
    }
  };

  const isPromptMatched = typedPrompt.trim() === challengePrompt.trim();

  return (
    <div className="flex-1 h-full min-h-full overflow-y-auto bg-black p-4 sm:p-6 md:p-8 text-white transition-colors space-y-6 font-mono max-w-4xl mx-auto w-full">
      {/* Page Header */}
      <div className="p-5 rounded-2xl bg-black border border-zinc-800 space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>REQUEST RESET KEY FROM ADMIN / MOD</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Normal created users panel to request an active 1-hour reset key directly from Administrators and Moderators.
            </p>
          </div>
        </div>
      </div>

      {/* Main Request Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-black border border-zinc-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-zinc-400" />
            <span>Target Account: <strong className="text-white font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-800 rounded">{userProfile?.email}</strong></span>
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-zinc-900 text-white rounded-md border border-zinc-700 uppercase tracking-wide">
            Active 1-Hour Token Engine
          </span>
        </div>

        {error && (
          <div className="p-3.5 bg-zinc-950 border border-zinc-700 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastSubmittedReq && (
          <div className="p-4 bg-black border-2 border-white text-white text-xs rounded-2xl space-y-3 animate-in fade-in shadow-xl">
            <div className="flex items-center gap-2 text-white font-black text-sm uppercase">
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
              <span>{lastSubmittedReq.status === 'approved' ? 'Reset Key Approved & Active!' : 'Reset Key Request Transmitted To Admin / Mod!'}</span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono">
              {lastSubmittedReq.status === 'approved' ? (
                <>Your security challenge sentence was verified and automatically approved! An active 1-hour reset key token (<code className="text-white font-bold">{lastSubmittedReq.token}</code>) is now ready to use.</>
              ) : (
                <>Your security authorization sentence was verified and transmitted to Admin & Moderator console! Please wait for an Admin or Moderator to approve your request. Once approved, your active key will appear below.</>
              )}
            </p>

            {lastSubmittedReq.status === 'approved' && lastSubmittedReq.resetLink && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Link
                  to={lastSubmittedReq.resetLink.replace(window.location.origin, '')}
                  className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-black" />
                  <span>Use Active 1-Hour Reset Key Now</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(lastSubmittedReq.resetLink);
                    setCopiedToken(lastSubmittedReq.token);
                    setTimeout(() => setCopiedToken(null), 2500);
                  }}
                  className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 uppercase transition-all cursor-pointer"
                >
                  {copiedToken === lastSubmittedReq.token ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{copiedToken === lastSubmittedReq.token ? 'Copied!' : 'Copy Direct Reset Link'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {/* Random Security Challenge Prompt Box (Non-selectable & Non-copyable) */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-300" />
                <span>Random Authorization Sentence Prompt:</span>
              </span>
              <button
                type="button"
                onClick={handleNextPrompt}
                className="text-[11px] text-zinc-400 hover:text-white underline flex items-center gap-1 cursor-pointer font-bold"
                title="Generate new sentence prompt"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Sentence Prompt</span>
              </button>
            </div>

            <div 
              onCopy={(e) => e.preventDefault()} 
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              className="p-3 bg-black border border-zinc-800 rounded-xl text-xs sm:text-sm font-mono font-bold text-white select-none break-all leading-relaxed shadow-inner pointer-events-none"
            >
              {challengePrompt}
            </div>

            <p className="text-[10px] text-zinc-500">
              * Type this exact sentence into the verification input below to authorize transmission to Admin and Moderator console.
            </p>
          </div>

          {/* Verification Textarea Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-white uppercase tracking-wider">
                Type Authorization Sentence Exact
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isPromptMatched ? 'bg-white text-black font-black' : typedPrompt ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'
              }`}>
                {isPromptMatched ? '✓ Match Exact' : typedPrompt ? 'Typing sentence...' : 'Required'}
              </span>
            </div>

            <textarea
              value={typedPrompt}
              onChange={(e) => setTypedPrompt(e.target.value)}
              placeholder="Type the exact sentence shown above..."
              rows={2}
              className={`w-full p-3 bg-black border rounded-xl text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                isPromptMatched
                  ? 'border-white ring-1 ring-white'
                  : 'border-zinc-800'
              }`}
              required
            />
          </div>

          {/* REQUEST RESET KEY FROM ADMIN / MOD BUTTON */}
          <button
            type="submit"
            disabled={loading || !isPromptMatched}
            className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              isPromptMatched
                ? 'bg-black text-white border-2 border-white hover:bg-zinc-900 cursor-pointer shadow-lg active:scale-[0.99]'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 opacity-60 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>REQUEST RESET KEY FROM ADMIN / MOD</span>
            )}
          </button>
        </form>
      </div>

      {/* User's Reset Key Requests History */}
      <div className="p-5 rounded-2xl bg-black border border-zinc-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <span>MY RESET KEY TICKET HISTORY</span>
          </h2>
          <span className="text-xs text-zinc-400 font-bold">
            Total: {myTickets.length}
          </span>
        </div>

        {myTickets.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 bg-black/40 border border-zinc-800 rounded-xl">
            No reset key requests submitted yet. Use the form above to request a key anytime.
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket) => {
              const isPending = ticket.status === 'pending';
              const isApproved = ticket.status === 'approved';
              const isCompleted = ticket.status === 'completed';
              const isDismissed = ticket.status === 'dismissed';

              const directLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(ticket.email)}&token=${ticket.token}`;

              return (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                    isPending
                      ? 'bg-black border-zinc-700'
                      : isApproved
                      ? 'bg-black border-white shadow-md'
                      : isCompleted
                      ? 'bg-zinc-950 border-zinc-800'
                      : 'bg-zinc-950/40 border-zinc-900 opacity-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">Ticket: <code className="text-zinc-300 font-mono">{ticket.id}</code></span>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                          isPending
                            ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : isApproved
                            ? 'bg-white text-black font-black'
                            : isCompleted
                            ? 'bg-zinc-700 text-white'
                            : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {isPending ? 'Pending Admin Review' : isApproved ? 'Approved Active Key' : ticket.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block">
                        Requested: {new Date(ticket.requestedAtMs).toLocaleString()}
                      </span>
                    </div>

                    {isApproved ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/reset-password?email=${encodeURIComponent(ticket.email)}&token=${ticket.token}`}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-black text-[11px] uppercase rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-black" />
                          <span>Use Active Reset Key</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(directLink);
                            setCopiedToken(ticket.token);
                            setTimeout(() => setCopiedToken(null), 2500);
                          }}
                          className="px-2.5 py-1.5 bg-black border border-zinc-700 hover:bg-zinc-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          {copiedToken === ticket.token ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                          <span>{copiedToken === ticket.token ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    ) : isPending ? (
                      <span className="text-[11px] text-amber-400 font-bold italic bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/60">
                        ⏳ Awaiting Admin / Mod Review
                      </span>
                    ) : null}
                  </div>

                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] space-y-1">
                    <span className="text-zinc-400 block font-bold">Typed Security Challenge Prompt:</span>
                    <p className="font-mono text-white bg-black p-1.5 rounded border border-zinc-800 select-all font-semibold break-all">
                      "{ticket.prompt}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
