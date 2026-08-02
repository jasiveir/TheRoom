import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <img src="/logos/TheRoom.jpg" alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#00ff41] tracking-wider uppercase matrix-text-glow">Reset Key</h1>
          <p className="text-xs text-[#00ff41]/70 mt-1 uppercase tracking-widest">// RECOVERY INSTRUCTIONS TRANSMISSION //</p>
        </div>

        {success ? (
          <div className="p-4 bg-[#111111] border border-[#00ff41]/50 text-[#00ff41] text-xs rounded-2xl text-center space-y-2 animate-in fade-in">
            <CheckCircle className="w-8 h-8 text-[#00ff41] mx-auto shadow-[0_0_10px_#00ff41]" />
            <p className="font-bold text-sm text-[#00ff41] uppercase tracking-wider">Reset Signal Transmitted!</p>
            <p className="text-[#00ff41]/80">Check terminal ({email}) for instructions to recalibrate your TheRoom access key.</p>
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
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@matrix.net"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#111111] border border-[#00ff41]/30 rounded-xl text-xs text-[#00ff41] placeholder-[#00ff41]/40 focus:outline-none focus:border-[#00ff41] matrix-border-glow"
                  required
                />
                <Mail className="w-4 h-4 text-[#00ff41]/50 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00ff41] hover:bg-[#39ff14] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.4)] flex items-center justify-center gap-2 transition-all uppercase tracking-wider active:scale-98"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Send className="w-4 h-4 text-black font-bold" />
                  <span>Transmit Reset Signal</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
