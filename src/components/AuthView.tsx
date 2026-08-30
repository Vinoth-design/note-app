import React, { useState, useEffect } from 'react';
import { Auth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { Sparkles, AlertCircle, CheckCircle2, Chrome } from 'lucide-react';

interface AuthViewProps {
  auth: Auth;
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
}

export default function AuthView({ auth, authNotice, setAuthNotice }: AuthViewProps) {
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

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
        setAuthNotice('Sign-in window was closed before completing. Please try again.');
      } else if (errorCode === 'auth/popup-blocked' || errorMessage.includes('popup-blocked')) {
        setAuthNotice('Pop-up window was blocked by your browser. Please allow pop-ups for this site or try again.');
      } else if (errorCode === 'auth/unauthorized-domain') {
        setAuthNotice(`[${errorCode}] Domain "${window.location.hostname}" is not authorized in Firebase Console (Authentication -> Settings -> Authorized domains).`);
      } else if (errorCode === 'auth/operation-not-allowed') {
        setAuthNotice(`[${errorCode}] Google Sign-In provider is disabled in Firebase Console (Authentication -> Sign-in method -> Google).`);
      } else {
        setAuthNotice(`Firebase Auth Error [${errorCode}]: ${errorMessage}`);
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
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
        <p className="text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xs mb-8">
          Sign in with your Google Account to access your notes and workspace.
        </p>

        {/* Global Notice / Error Banner */}
        {authNotice && (
          <div className="w-full mb-6 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 text-left animate-in fade-in duration-200 border bg-rose-50 dark:bg-rose-950/30 border-rose-300/60 dark:border-rose-800/40 text-rose-800 dark:text-rose-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1">
              <p className="leading-snug">{authNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions Container */}
        <div className="w-full space-y-3">
          {/* Google SSO Button */}
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
                <Chrome size={18} className="flex-shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
