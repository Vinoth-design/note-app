import React, { useState, useEffect } from 'react';
import { Auth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  auth: Auth;
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
}

export default function AuthView({ auth, authNotice, setAuthNotice }: AuthViewProps) {
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
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
        setAuthNotice('Sign-in window was closed before completing. Please click below to try again.');
      } else if (errorCode === 'auth/popup-blocked' || errorMessage.includes('popup-blocked')) {
        setAuthNotice('Pop-up window was blocked by your browser. Use the "Sign In via Redirect" button below or allow popups.');
      } else if (errorCode === 'auth/unauthorized-domain') {
        setAuthNotice(`[${errorCode}] Domain "${window.location.hostname}" is not authorized for Google SSO in Firebase Console. Click "Continue as Demo User" below to enter your workspace instantly!`);
      } else if (errorCode === 'auth/operation-not-allowed') {
        setAuthNotice(`[${errorCode}] Google Sign-In provider is disabled in Firebase Console (Authentication -> Sign-in method -> Google).`);
      } else {
        setAuthNotice(`Firebase Auth Error [${errorCode}]: ${errorMessage}`);
      }
    } finally {
      setIsGoogleSigningIn(false);
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
          Keep track of your tasks
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xs mb-8">
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

        {/* Actions Container */}
        <div className="w-full space-y-3">
          {/* Google SSO Button (Popup) */}
          <button
            type="button"
            onClick={() => handleGoogleSignIn(false)}
            disabled={isGoogleSigningIn}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleSigningIn ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-white dark:border-t-black rounded-full animate-spin flex-shrink-0" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Google SSO Button (Redirect Mode) */}
          <button
            type="button"
            onClick={() => handleGoogleSignIn(true)}
            disabled={isGoogleSigningIn}
            className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-[#232321] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🔗 Sign In via Redirect (Pop-up Fallback)</span>
          </button>

          {/* Demo User Fallback Button */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            className="w-full py-3 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-[#232321] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚡ Continue as Demo User (Instant Workspace)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

