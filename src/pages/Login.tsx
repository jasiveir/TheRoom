import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMatrixTransition } from '../context/MatrixTransitionContext';
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';
import { clearMobileBypass } from '../lib/deviceUtils';

export const Login: React.FC = () => {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { triggerMatrixTransition } = useMatrixTransition();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      clearMobileBypass();
      triggerMatrixTransition(() => {
        navigate('/');
      }, 700, true);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBackToOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/welcome');
    }, 700, true);
  };

  const handleGoToSignup = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/signup');
    }, 700, true);
  };

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
      clearMobileBypass();
      triggerMatrixTransition(() => {
        navigate('/');
      }, 700, true);
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
        <button 
          type="button"
          onClick={handleBackToOptions}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black mb-4 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Option Selection</span>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl mx-auto mb-3 overflow-hidden shadow-md">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-wider uppercase">TheRoom</h1>
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
              <Link 
                to="/forgot-password" 
                className="text-[11px] font-bold text-zinc-600 hover:text-black transition-colors uppercase tracking-wider hover:underline"
              >
                Request Reset Key?
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
            disabled={loading || googleLoading}
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

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2dfd2]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-500 font-semibold text-[10px]">Or Direct Google Login</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-3 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-800 font-bold flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-98"
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
              <span>Sign In Directly with Google Account</span>
            </>
          )}
        </button>

        <div className="mt-6 pt-4 border-t border-[#e2dfd2] text-center">
          <p className="text-xs text-zinc-600">
            Need an account?{' '}
            <button
              type="button"
              onClick={handleGoToSignup}
              className="text-black font-bold hover:underline uppercase tracking-wider cursor-pointer"
            >
              Create New Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

