import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { useMatrixTransition } from '../context/MatrixTransitionContext';
import { useLayoutTemplate, WEB_UI_STYLES, WebUiStyleId } from '../context/LayoutTemplateContext';
import { MatrixTheme } from '../components/matrix/MatrixRainCanvas';
import { compressAndResizeImage, sanitizePhotoURL } from '../lib/imageUtils';
import { 
  User, 
  Lock, 
  Bell, 
  Volume2, 
  VolumeX, 
  Moon, 
  Save, 
  Hash, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Terminal,
  Zap,
  EyeOff,
  Sparkles,
  Play,
  Upload,
  Camera,
  X,
  Palette,
  Layout
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userProfile, updateProfileData, changePassword } = useAuth();
  const { soundEnabled, setSoundEnabled } = useNotifications();
  const { darkMode, toggleDarkMode } = useTheme();
  const { reduceMotion, toggleReduceMotion, matrixTheme, setMatrixTheme, triggerMatrixTransition } = useMatrixTransition();
  const { templateId, setLayoutTemplate } = useLayoutTemplate();

  const getThemeClasses = (theme: typeof matrixTheme) => {
    switch (theme) {
      case 'crimson':
        return {
          icon: 'text-rose-400',
          btnBg: 'bg-rose-950 hover:bg-rose-900 border-rose-800 text-rose-300',
        };
      case 'purple':
        return {
          icon: 'text-purple-400',
          btnBg: 'bg-purple-950 hover:bg-purple-900 border-purple-800 text-purple-300',
        };
      case 'amber':
        return {
          icon: 'text-amber-400',
          btnBg: 'bg-amber-950 hover:bg-amber-900 border-amber-800 text-amber-300',
        };
      case 'monochrome':
      default:
        return {
          icon: 'text-zinc-300',
          btnBg: 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200',
        };
    }
  };

  const themeStyle = getThemeClasses(matrixTheme);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [country, setCountry] = useState(userProfile?.country || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(userProfile?.dateOfBirth || '');

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingProfile(true);
      const compressedDataUrl = await compressAndResizeImage(file, 256, 256, 0.75);
      setPhotoURL(compressedDataUrl);
      setProfileError(null);
    } catch (err) {
      console.error('Failed to compress image:', err);
      setProfileError('Could not process selected image.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const cleanPhotoURL = await sanitizePhotoURL(photoURL);

      await updateProfileData({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        bio: bio.trim(),
        photoURL: cleanPhotoURL,
        country: country.trim(),
        city: city.trim(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: dateOfBirth.trim()
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setSavingPass(true);

    try {
      await changePassword(newPassword);
      setPassSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || 'Could not change password.');
    } finally {
      setSavingPass(false);
    }
  };

  const { template } = useLayoutTemplate();

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-white p-4 sm:p-6 overflow-y-auto font-sans transition-colors">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="pb-4 border-b-2 border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide">
              <User className="w-5 h-5 text-white" />
              <span>Account Settings</span>
            </h2>
            {template.id === 'apple-glass' && (
              <span className="retro-badge-spectrum ml-2">
                TERMINAL CONFIG
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your public profile, preferences, and security settings
          </p>
        </div>

        {/* Friend Code Read-Only Card */}
        <div className="p-4 bg-zinc-900 rounded-2xl text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Your Unique Friend Code</span>
            <p className="text-xl font-mono font-extrabold tracking-widest mt-0.5 text-white">{userProfile?.friendCode}</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Share this code with friends so they can add you directly. Friend Codes cannot be modified.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-black border-2 border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center shrink-0">
            <Hash className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="bg-zinc-900 rounded-2xl border-2 border-zinc-800 p-6 space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-zinc-800">
            <User className="w-4 h-4 text-white" />
            <span>Personal Information</span>
          </h3>

          {profileSuccess && (
            <div className="p-3 bg-black border border-zinc-800 text-white text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-white" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-black border border-zinc-800 text-zinc-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Profile Picture
              </label>

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

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                    {photoURL ? (
                      <img src={photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-zinc-500" />
                    )}
                  </div>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Remove Avatar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Date of Birth / Age
              </label>
              <input
                type="text"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. San Francisco"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Short personal bio..."
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                {savingProfile ? (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-black border-t-transparent" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preferences Settings Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Bell className="w-4 h-4 text-white" />
            <span>Preferences & Sound</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-black rounded-xl border border-zinc-800 gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {soundEnabled ? <Volume2 className="w-5 h-5 text-white shrink-0" /> : <VolumeX className="w-5 h-5 text-zinc-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-white">Notification Sounds</p>
                  <p className="text-[11px] text-zinc-400 leading-snug break-words">Play chime effect when new private or group messages arrive</p>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${soundEnabled ? 'bg-white' : 'bg-zinc-800 border border-zinc-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${soundEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-400'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-black rounded-xl border border-zinc-800 gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <Moon className="w-5 h-5 text-white shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-white">Dark Theme</p>
                  <p className="text-[11px] text-zinc-400 leading-snug break-words">Application strictly uses black & white high-contrast theme</p>
                </div>
              </div>
              <div className="shrink-0 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] font-bold text-white">
                Monochrome
              </div>
            </div>
          </div>
        </div>

        {/* Web UI Style Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Web Interface Design Style</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 bg-black px-2.5 py-1 rounded-full border border-zinc-800 uppercase">
              Active: {WEB_UI_STYLES[templateId]?.badge}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Choose your preferred interface theme. Select between our classic crisp layout or Apple-inspired frosted spectrum glass UI.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {Object.values(WEB_UI_STYLES).map((style) => {
              const isSelected = templateId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setLayoutTemplate(style.id);
                    triggerMatrixTransition();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-black border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                      : 'bg-black/60 border-zinc-800 hover:border-zinc-700 hover:bg-black/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-white group-hover:text-rose-300 transition-colors uppercase tracking-wider">
                          {style.name}
                        </h4>
                      </div>
                      <span className="inline-block text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 mt-1">
                        {style.badge}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-500/50 px-2.5 py-1 rounded-full shrink-0">
                        <Check className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-white transition-colors shrink-0 px-2 py-0.5 border border-zinc-800 rounded-full">
                        Select
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {style.description}
                  </p>

                  {style.id === 'apple-glass' && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-mono">Spectrum Backlight:</span>
                        <span className="retro-badge-spectrum text-[8px] py-0.5">AUTO SPECTRUM CYCLE</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-xs" title="Orange" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" title="Green" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-xs" title="Yellow" />
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-xs" title="Blue" />
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse shadow-xs" title="Pink" />
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-xs" title="Purple" />
                      </div>
                    </div>
                  )}

                  {style.id === 'classic' && (
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-500 font-mono">
                      <span>Monochrome & Crisp Warm Neutral Canvas</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Matrix Digital Rain Engine Settings Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className={`w-4 h-4 ${themeStyle.icon} shrink-0`} />
              <span>Matrix Digital Rain Engine</span>
            </h3>
            <button
              onClick={() => triggerMatrixTransition()}
              className={`w-full sm:w-auto justify-center px-3 py-1.5 ${themeStyle.btnBg} rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0`}
            >
              <Play className={`w-3.5 h-3.5 ${themeStyle.icon}`} />
              <span>Test Transition</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Signature HTML5 Canvas Digital Rain transition engine providing GPU-accelerated mutating Katakana, Hex, & Binary stream cascades between pages and sections.
          </p>

          <div className="space-y-3">
            {/* Reduce Motion Toggle */}
            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-black rounded-xl border border-zinc-800 gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <EyeOff className={`w-5 h-5 ${themeStyle.icon} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-white">Reduce Motion / Accessibility</p>
                  <p className="text-[11px] text-zinc-400 leading-snug break-words">
                    Disable Matrix canvas animations and replace with quick fade transitions.
                  </p>
                </div>
              </div>
              <button
                onClick={toggleReduceMotion}
                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  reduceMotion ? 'bg-amber-500' : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    reduceMotion ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            {/* Matrix Color Palette Selection */}
            <div className="p-3 sm:p-3.5 bg-black rounded-xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5 min-w-0">
                  <Sparkles className={`w-3.5 h-3.5 ${themeStyle.icon} shrink-0`} />
                  <span className="truncate">Matrix Digital Rain Palette</span>
                </span>
                <span className="text-[10px] text-zinc-500 capitalize shrink-0 font-mono">Active: {matrixTheme}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'crimson', name: 'Crimson Red', color: 'border-rose-500 text-rose-400 bg-rose-950/40' },
                  { id: 'purple', name: 'Cyber Purple', color: 'border-purple-500 text-purple-400 bg-purple-950/40' },
                  { id: 'amber', name: 'Amber Gold', color: 'border-amber-500 text-amber-400 bg-amber-950/40' },
                  { id: 'monochrome', name: 'Monochrome Silver', color: 'border-slate-400 text-slate-200 bg-slate-900/60' },
                ].map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => setMatrixTheme(palette.id as MatrixTheme)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-1 cursor-pointer min-w-0 ${
                      matrixTheme === palette.id
                        ? `${palette.color} ring-1 ring-white/20 shadow-md`
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 bg-zinc-900/50'
                    }`}
                  >
                    <span className="text-[11px] truncate leading-tight">{palette.name}</span>
                    {matrixTheme === palette.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Password Security Form */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Lock className="w-4 h-4 text-white" />
            <span>Change Password</span>
          </h3>

          {passSuccess && (
            <div className="p-3 bg-black border border-zinc-800 text-white text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-white" />
              <span>Password updated successfully!</span>
            </div>
          )}

          {passError && (
            <div className="p-3 bg-black border border-zinc-800 text-zinc-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                required
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPass || !newPassword}
                className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold disabled:opacity-50 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                {savingPass ? (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-black border-t-transparent" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
