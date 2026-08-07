import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Shield, Sparkles, MessageSquare, ArrowRight, AlertCircle } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';
import { useAuth } from '../context/AuthContext';
import { useMatrixTransition } from '../context/MatrixTransitionContext';
import { clearMobileBypass } from '../lib/deviceUtils';

export const AuthSelection: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { triggerMatrixTransition } = useMatrixTransition();
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

  const handleNavigateToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/login');
    }, 700, true);
  };

  const handleNavigateToSignup = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/signup');
    }, 700, true);
  };

  return (
    <div className="min-h-dvh w-full bg-[#fbfaf6] text-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden">
      <div className="w-full max-w-lg bg-white border border-[#e2dfd2] rounded-2xl p-6 sm:p-10 shadow-sm relative z-10 font-mono text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-3xl mb-4 overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200">
            <img 
              src={logoImg} 
              onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} 
              alt="TheRoom Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          <h1 className="text-3xl font-extrabold text-black tracking-wider uppercase">TheRoom</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1.5 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>SECURE PRIVATE MESSAGING</span>
          </p>
        </div>

        <p className="text-xs text-zinc-600 mb-8 max-w-sm mx-auto leading-relaxed">
          Welcome to TheRoom. Experience real-time end-to-end encrypted messaging, customizable Matrix interfaces, and private group rooms.
        </p>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selection Cards */}
        <div className="space-y-3.5">
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="group w-full p-4 bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-200 hover:border-black rounded-xl flex items-center justify-between transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {googleLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
              </div>
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-black flex items-center gap-1.5">
                  <span>Continue with Google</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-extrabold">Instant</span>
                </h2>
                <p className="text-[11px] text-zinc-500 font-normal">Fast 1-click sign in with your Google Account.</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-black group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          <button
            onClick={handleNavigateToLogin}
            className="group w-full p-4 bg-black hover:bg-zinc-800 text-white rounded-xl flex items-center justify-between transition-all shadow-sm hover:shadow-md cursor-pointer border border-black"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-white">Log In To Account</h2>
                <p className="text-[11px] text-zinc-400 font-normal">Already registered? Sign in with your credentials.</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          <button
            onClick={handleNavigateToSignup}
            className="group w-full p-4 bg-[#fbfaf6] hover:bg-[#f3f0e6] text-black border border-[#d8d4c5] hover:border-black rounded-xl flex items-center justify-between transition-all shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-black">Create New Account</h2>
                <p className="text-[11px] text-zinc-600 font-normal">New here? Set up your account & avatar in seconds.</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-black group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-8 pt-6 border-t border-[#e2dfd2] grid grid-cols-3 gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          <div className="flex flex-col items-center gap-1">
            <MessageSquare className="w-4 h-4 text-zinc-700" />
            <span>Private Rooms</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Encrypted</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Custom Matrix</span>
          </div>
        </div>
      </div>
    </div>
  );
};
