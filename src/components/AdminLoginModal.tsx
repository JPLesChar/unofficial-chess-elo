import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Key, Eye, EyeOff, ShieldCheck, AlertCircle, X, Loader2, CheckCircle2, Info } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [envStatus, setEnvStatus] = useState<{
    loaded: boolean;
    hasAdminPasswordConfigured: boolean;
  }>({ loaded: false, hasAdminPasswordConfigured: false });

  // Query server health status when opening modal
  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setError(null);
      setErrorDetails(null);
      setIsVerifying(false);

      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => {
          setEnvStatus({
            loaded: true,
            hasAdminPasswordConfigured: Boolean(data?.hasAdminPasswordConfigured),
          });
        })
        .catch((err) => {
          console.warn('[Admin Modal] Unable to fetch /api/health:', err);
          setEnvStatus({ loaded: true, hasAdminPasswordConfigured: false });
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcode.trim();

    if (!entered) {
      setError('Password Required');
      setErrorDetails('Please enter the administrator password.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setErrorDetails(null);

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: entered,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        console.log('[Admin Login] Verified successfully.');
        setError(null);
        setErrorDetails(null);
        onLoginSuccess();
        onClose();
      } else {
        console.error('[Admin Auth Failed] Password verification was rejected:', {
          httpStatus: response.status,
          responseBody: data,
          attemptedLength: entered.length,
        });

        setError('Invalid Password');
        setErrorDetails(data?.hint || 'The password entered does not match. Default fallback is: chessadmin123');
      }
    } catch (err) {
      console.error('[Admin Login] Network or server error during verification:', err);
      setError('Connection Error');
      setErrorDetails('Could not reach verification endpoint. Please verify server status.');
    } finally {
      setIsVerifying(false);
    }
  };

  const useFallbackPasscode = () => {
    setPasscode('chessadmin123');
    setError(null);
    setErrorDetails(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          disabled={isVerifying}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              isAdmin
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
            }`}
          >
            {isAdmin ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isAdmin ? 'Admin Mode Active' : 'Admin Authentication'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Editing permissions unlocked. You can add members, record matches, and edit data.'
                : 'Enter the admin password to unlock data entry and editing privileges.'}
            </p>
          </div>
        </div>

        {/* Environment Status Badge */}
        {!isAdmin && (
          <div className="mb-4">
            {envStatus.loaded && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  envStatus.hasAdminPasswordConfigured
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                }`}
              >
                {envStatus.hasAdminPasswordConfigured ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {envStatus.hasAdminPasswordConfigured
                        ? 'ADMIN_PASSWORD set in environment'
                        : 'Default Admin Passcode Active'}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        envStatus.hasAdminPasswordConfigured
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {envStatus.hasAdminPasswordConfigured ? 'Custom + Fallback' : 'Fallback Active'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {envStatus.hasAdminPasswordConfigured ? (
                      <>
                        Environment password loaded, or use fallback{' '}
                        <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono font-bold text-amber-300">
                          chessadmin123
                        </code>
                      </>
                    ) : (
                      <>
                        Accepts default admin passcode:{' '}
                        <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono font-bold text-amber-300">
                          chessadmin123
                        </code>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Feedback Message */}
        {error && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3 text-xs text-rose-300 animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="font-bold text-rose-200">{error}</span>
              <span className="text-[11px] text-rose-300/90 leading-relaxed mt-0.5">
                {errorDetails}
              </span>
              <button
                type="button"
                onClick={useFallbackPasscode}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline text-left"
              >
                Click here to autofill default passcode &quot;chessadmin123&quot;
              </button>
            </div>
          </div>
        )}

        {/* State 1: Already Logged In */}
        {isAdmin ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Signed in as Administrator</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                You have full write access: record match results, add and edit player ratings, reset rosters, and manage checkpoints.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Keep Admin Open
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                Lock & Exit Admin Mode
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Prompt for Passcode */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={useFallbackPasscode}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium hover:underline"
                >
                  Use default passcode (chessadmin123)
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) {
                      setError(null);
                      setErrorDetails(null);
                    }
                  }}
                  placeholder="Enter admin password or chessadmin123"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-4 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
                  autoFocus
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  disabled={isVerifying}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Note on environment variable and fallback */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 flex items-start gap-2">
              <Key className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-slate-300 font-medium">Dual Access Support: </span>
                <p className="text-slate-400 leading-normal">
                  You can sign in using your <code className="text-amber-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded text-[11px]">ADMIN_PASSWORD</code> environment variable or the fallback passcode <code className="text-amber-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded text-[11px]">chessadmin123</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Unlock Admin Mode
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
