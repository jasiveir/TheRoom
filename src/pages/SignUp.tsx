import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMatrixTransition } from '../context/MatrixTransitionContext';
import { compressAndResizeImage, sanitizePhotoURL } from '../lib/imageUtils';
import logoImg from '../assets/TheRoom.jpg';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle, 
  Globe, 
  MapPin, 
  Calendar, 
  Phone, 
  Image as ImageIcon,
  Camera,
  Upload,
  X,
  ArrowLeft,
  Check
} from 'lucide-react';

export const SignUp: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { triggerMatrixTransition } = useMatrixTransition();

  const handleBackToOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/welcome');
    }, 700, true);
  };

  const handleGoToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerMatrixTransition(() => {
      navigate('/login');
    }, 700, true);
  };

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Please select an image smaller than 15MB.');
      return;
    }

    try {
      setLoading(true);
      const compressedDataUrl = await compressAndResizeImage(file, 256, 256, 0.75);
      setPhotoURL(compressedDataUrl);
      setError(null);
    } catch (err) {
      console.error('Failed to compress image:', err);
      setError('Could not process the selected image. Please try another image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Account not identified. Please use a valid Google email address (@gmail.com) to create an account so password resets work.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const formattedDob = (birthYear && birthMonth && birthDay)
      ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
      : '';

    try {
      const cleanPhotoURL = await sanitizePhotoURL(photoURL);

      await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        dateOfBirth: formattedDob,
        country: country.trim(),
        city: city.trim(),
        phoneNumber: phoneNumber.trim(),
        photoURL: cleanPhotoURL
      });

      triggerMatrixTransition(() => {
        navigate('/');
      }, 700, true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Email & Password authentication is disabled in your Firebase Console project. Please enable Email/Password provider under Firebase Auth settings.');
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('Email is already taken')) {
        setError('Email is already taken.');
      } else if (err.message?.includes('Username is already taken')) {
        setError('Username is already taken.');
      } else if (err.message?.includes('Phone number is already taken')) {
        setError('Phone number is already taken.');
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#fbfaf6] text-black flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden py-12">
      <div className="w-full max-w-xl bg-white border border-[#e2dfd2] rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 font-mono">
        {/* Navigation back */}
        <button 
          type="button"
          onClick={handleBackToOptions}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black mb-4 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Option Selection</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-black text-2xl mx-auto mb-2 overflow-hidden shadow-md">
            <img src={logoImg} onError={(e) => { e.currentTarget.src = '/logos/logo.jpg'; }} alt="TheRoom Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-wider uppercase">Join TheRoom</h1>
          <p className="text-xs text-zinc-600 font-medium uppercase tracking-widest">// CREATE ACCOUNT & FRIEND CODE //</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                  required
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full px-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                  required
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Password *
              </label>
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

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Date of Birth</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="" disabled>Month</option>
                  {[
                    { val: '1', name: 'Jan' },
                    { val: '2', name: 'Feb' },
                    { val: '3', name: 'Mar' },
                    { val: '4', name: 'Apr' },
                    { val: '5', name: 'May' },
                    { val: '6', name: 'Jun' },
                    { val: '7', name: 'Jul' },
                    { val: '8', name: 'Aug' },
                    { val: '9', name: 'Sep' },
                    { val: '10', name: 'Oct' },
                    { val: '11', name: 'Nov' },
                    { val: '12', name: 'Dec' },
                  ].map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="" disabled>Day</option>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="" disabled>Year</option>
                  {Array.from({ length: 105 }, (_, i) => String(new Date().getFullYear() - i)).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                />
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                />
                <Globe className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1 uppercase tracking-wider">
                City
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d8d4c5] rounded-xl text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                />
                <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-black mb-2 uppercase tracking-wider">
                Profile Avatar Picture (Optional)
              </label>

              {/* Hidden file inputs for gallery and camera */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleImageFileChange}
                className="hidden"
              />

              <div className="p-4 bg-[#fcfbf7] border border-[#d8d4c5] rounded-xl flex flex-col sm:flex-row items-center gap-4">
                {/* Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-black flex items-center justify-center overflow-hidden shadow-xs">
                    {photoURL ? (
                      <img src={photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-zinc-400" />
                    )}
                  </div>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Remove Avatar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Avatar Actions */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 sm:flex-initial px-3 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>App Gallery / Device Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 sm:flex-initial px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-black border border-[#d8d4c5] font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Take Photo</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[11px] text-zinc-600 hover:text-black font-semibold underline cursor-pointer"
                    >
                      {showUrlInput ? 'Hide URL Option' : 'Or paste Image URL instead'}
                    </button>
                    {photoURL && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Avatar Attached
                      </span>
                    )}
                  </div>

                  {showUrlInput && (
                    <div className="relative pt-1 animate-in fade-in">
                      <input
                        type="url"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#d8d4c5] rounded-lg text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                      />
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-white font-bold" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e2dfd2] text-center">
          <p className="text-xs text-zinc-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={handleGoToLogin}
              className="text-black font-bold hover:underline uppercase tracking-wider cursor-pointer"
            >
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

