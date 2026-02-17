interface AuthPanelProps {
  configured: boolean;
  signedIn: boolean;
  userName?: string;
  userEmail?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AuthPanel({
  configured,
  signedIn,
  userName,
  userEmail,
  onSignIn,
  onSignOut
}: AuthPanelProps) {
  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        Google OAuth is not configured. Set `VITE_GOOGLE_OAUTH_CLIENT_ID` to enable Sheets-backed auth.
      </div>
    );
  }

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Signed in</p>
        <p className="text-sm font-semibold text-slate-100">{userName}</p>
        <p className="text-xs text-slate-400">{userEmail}</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400"
      >
        Sign out
      </button>
    </div>
  );
}
