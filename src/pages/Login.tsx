import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Email/Password authentication is disabled in your Firebase Console. Falling back to internal credentials.');
      } else if (err.message?.includes('blocked')) {
        setError('Your account has been blocked by an administrator.');
      } else if (err.message?.includes('deactivated')) {
        setError('Your account has been deactivated.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your credentials or register a new account.');
      } else {
        setError(err.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#fbfaf6] text-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden">
      <div className="w-full max-w-md bg-white border border-[#e2dfd2] rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 font-mono">
        {/* Navigation back */}
        <Link 
          to="/welcome" 
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black mb-4 font-semibold uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Option Selection</span>
        </Link>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl mx-auto mb-3 overflow-hidden shadow-md">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-wider uppercase">TheRoom</h1>
          <p className="text-xs text-zinc-600 font-medium mt-1 uppercase tracking-widest">// SECURE MESSAGING // Vintage Node //</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@theroom.app"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                required
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-black uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-zinc-600 hover:text-black hover:underline">
                Reset Key?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                required
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-black"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#d8d4c5] bg-white text-black focus:ring-black accent-black"
              />
              <span className="text-xs text-zinc-600 font-medium">Remember login session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="w-4 h-4 text-white font-bold" />
                <span>Log In To System</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e2dfd2] text-center">
          <p className="text-xs text-zinc-600">
            Need an account?{' '}
            <Link to="/signup" className="text-black font-bold hover:underline uppercase tracking-wider">
              Create New Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

