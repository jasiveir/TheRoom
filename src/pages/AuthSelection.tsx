import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Shield, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import logoImg from '../assets/TheRoom.jpg';

export const AuthSelection: React.FC = () => {
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

        {/* Selection Cards */}
        <div className="space-y-4">
          <Link
            to="/login"
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
          </Link>

          <Link
            to="/signup"
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
          </Link>
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
