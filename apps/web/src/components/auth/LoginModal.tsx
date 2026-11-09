"use client";

import React, { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";

interface LoginModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const auth = useAuth();
  const isOpen = open !== undefined ? open : auth.isLoginModalOpen;
  const handleOpenChange = onOpenChange || ((val: boolean) => (val ? auth.openLoginModal() : auth.closeLoginModal()));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customToken, setCustomToken] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // In dev/test or when external GIS client isn't loaded, use mock token
      const mockToken = `mock-google-token-user${Math.floor(1000 + Math.random() * 9000)}-OddlyPlayer`;
      const res = await auth.loginWithGoogleToken(mockToken);
      if (!res.ok) {
        setError(res.error || "Failed to sign in. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await auth.loginWithGoogleToken(customToken.trim());
      if (!res.ok) {
        setError(res.error || "Invalid token");
      }
    } catch (err: any) {
      setError(err?.message || "Token verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex flex-col items-center text-center px-2 py-4">
        {/* Brand Rings */}
        <div className="flex items-center justify-center -space-x-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-violet/30 border-2 border-violet backdrop-blur-sm" />
          <div className="w-10 h-10 rounded-full bg-mint/30 border-2 border-mint backdrop-blur-sm shadow-[0_0_15px_rgba(46,234,177,0.3)]" />
        </div>

        {/* Headline */}
        <h2 className="font-heading text-2xl font-bold text-text mb-2">
          Save your streaks &amp; sealed twins
        </h2>
        <p className="text-sm font-body text-text-muted max-w-sm mb-6 leading-relaxed">
          Sync your stranger twins across devices, preserve your daily streak, and unlock your lifetime oddness archive.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-flame/10 border border-flame/30 text-flame text-sm text-left">
            {error}
          </div>
        )}

        {/* Google 1-Tap CTA */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          )}
          <span>{loading ? "Signing in..." : "Continue with Google"}</span>
        </button>

        {/* Collapsible ID Token for tests / dev */}
        <div className="w-full mb-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-text-muted hover:text-text underline"
          >
            {showAdvanced ? "Hide manual token" : "Developer: enter custom ID token"}
          </button>
          {showAdvanced && (
            <form onSubmit={handleCustomTokenSubmit} className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Google ID Token (e.g. mock-google-token-alice-Alice)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-alt border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-violet"
              />
              <Button type="submit" variant="secondary" size="sm" loading={loading}>
                Submit Token
              </Button>
            </form>
          )}
        </div>

        {/* Reassurance Grid */}
        <div className="w-full pt-4 border-t border-border flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>No passwords to remember • 1-tap sign-in</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>DPDP compliant • Zero plaintext email storage</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>We never spam, email, or post to your account</span>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
