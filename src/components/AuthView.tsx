import React, { useState, useEffect } from 'react';
import { Auth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Sparkles, AlertCircle, CheckCircle2, Mail, Lock, UserPlus, LogIn, Chrome } from 'lucide-react';

interface AuthViewProps {
  auth: Auth;
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
}

export default function AuthView({ auth, authNotice, setAuthNotice }: AuthViewProps) {
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  // Email & Password Auth State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Check redirect result on mount if redirected back from Google
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      if (err) {
        console.error('Firebase Auth Redirect Error:', err);
        const code = err?.code || 'auth/unknown';
        const msg = err?.message || String(err);
        setAuthNotice(`Google Sign-In Redirect Error [${code}]: ${msg}`);
      }
    });
  }, [auth, setAuthNotice]);

  const handleGoogleSignIn = async (useRedirect = false) => {
    setIsGoogleSigningIn(true);
    setLocalMessage(null);
    setAuthNotice(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      const errorCode = err?.code || 'auth/unknown';
      const errorMessage = err?.message || String(err);

      console.error('Firebase Google Sign-In Error:', errorCode, errorMessage, err);

      if (errorCode === 'auth/popup-closed-by-user' || errorMessage.includes('popup-closed-by-user')) {
        setAuthNotice('Sign-in window was closed. Click below to try again.');
      } else if (errorCode === 'auth/popup-blocked' || errorMessage.includes('popup-blocked')) {
        setAuthNotice('Pop-up window was blocked by your browser. Use the "Sign In via Redirect" button below.');
      } else if (errorCode === 'auth/unauthorized-domain') {
        setAuthNotice(`[${errorCode}] Domain "${window.location.hostname}" is not authorized for Google SSO. Click "Continue as Demo User" below to enter your workspace instantly!`);
      } else if (errorCode === 'auth/operation-not-allowed') {
        setAuthNotice(`[${errorCode}] Google Sign-In provider is disabled in Firebase Console.`);
      } else {
        setAuthNotice(`Firebase Auth Error [${errorCode}]: ${errorMessage}`);
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }

    setIsEmailLoading(true);
    setLocalMessage(null);
    setAuthNotice(null);

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setLocalMessage({ type: 'success', text: 'Account created successfully! Logging in...' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const errorCode = err?.code || 'auth/unknown';
      const errorMessage = err?.message || String(err);
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
        setLocalMessage({ type: 'error', text: 'Invalid email or password credentials.' });
      } else if (errorCode === 'auth/email-already-in-use') {
        setLocalMessage({ type: 'error', text: 'An account with this email already exists. Try signing in.' });
      } else if (errorCode === 'auth/weak-password') {
        setLocalMessage({ type: 'error', text: 'Password should be at least 6 characters long.' });
      } else {
        setLocalMessage({ type: 'error', text: `Auth Error [${errorCode}]: ${errorMessage}` });
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    const demoUser = {
      uid: 'demo_user_' + Math.random().toString(36).substring(2, 9),
      email: 'demo@nestnote.app',
      displayName: 'Demo User',
      photoURL: null,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    localStorage.setItem('nestnote_demo_user', JSON.stringify(demoUser));
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#FBFBFA] dark:bg-[#0F0F0E] text-[#37352F] dark:text-[#E3E3E2] p-4 md:p-6 font-sans select-none relative overflow-y-auto">
      {/* Ambient backdrop graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-[#161614] border border-[#EDECE9] dark:border-[#232321] rounded-3xl p-6 md:p-8 shadow-xl relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 my-auto">
        {/* Main Icon Branding */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center shadow-md mb-4 hover:rotate-3 transition-transform duration-300">
          <Sparkles size={28} className="text-white" />
        </div>

        {/* Header Typography */}
        <h2 className="text-2xl font-extrabold text-[#37352F] dark:text-white tracking-tight mb-1">
          NestNote Workspace
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xs mb-6">
          Stay organized with your notes, tasks, and projects wherever you work.
        </p>

        {/* Global Notice / Error Banner */}
        {(authNotice || localMessage) && (
          <div
            className={`w-full mb-6 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 text-left animate-in fade-in duration-200 border ${
              localMessage?.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300/60 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
            }`}
          >
            {localMessage?.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            )}
            <div className="flex-1">
              <p className="leading-snug">{localMessage?.text || authNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalMessage(null);
                setAuthNotice(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-3 mb-4 text-left">
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1E1E1C] border border-slate-200 dark:border-[#2A2A28] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1E1E1C] border border-slate-200 dark:border-[#2A2A28] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isEmailLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isEmailLoading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : authMode === 'signup' ? (
              <>
                <UserPlus size={14} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn size={14} />
                <span>Sign In with Email</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between w-full mb-4 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            className="hover:text-indigo-500 transition-colors"
          >
            {authMode === 'signin' ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative w-full flex items-center justify-center my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
          <span className="relative bg-white dark:bg-[#161614] px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">or sign in with</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5 mt-3">
          {/* Google SSO Button (Popup) */}
          <button
            type="button"
            onClick={() => handleGoogleSignIn(false)}
            disabled={isGoogleSigningIn}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {isGoogleSigningIn ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-white dark:border-t-black rounded-full animate-spin" />
            ) : (
              <Chrome size={16} />
            )}
            <span>Continue with Google</span>
          </button>

          {/* Demo User Fallback Button */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚡ Continue as Demo User (Instant Workspace)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
