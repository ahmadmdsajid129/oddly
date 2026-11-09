"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push("/");
    }
  }, [auth.isAuthenticated, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const mockToken = `mock-google-token-web${Math.floor(1000 + Math.random() * 9000)}-WebPlayer`;
      const res = await auth.loginWithGoogleToken(mockToken);
      if (res.ok) {
        router.push("/");
      } else {
        setError(res.error || "Failed to sign in. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <Atmosphere />

      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-2xl border border-border flex flex-col items-center text-center relative z-10 backdrop-blur-md">
        {/* Brand Rings */}
        <div className="flex items-center justify-center -space-x-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-violet/30 border-2 border-violet backdrop-blur-sm" />
          <div className="w-12 h-12 rounded-full bg-mint/30 border-2 border-mint backdrop-blur-sm shadow-[0_0_20px_rgba(46,234,177,0.3)]" />
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text mb-2">
          Someone out there is oddly like you
        </h1>
        <p className="text-sm font-body text-text-muted max-w-sm mb-8 leading-relaxed">
          Sign in to preserve your daily oddness scores, protect your streak, and revisit your sealed stranger twins.
        </p>

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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="text-text-muted hover:text-text mb-6"
        >
          Return to home as guest
        </Button>

        {/* Reassurance Grid */}
        <div className="w-full pt-4 border-t border-border flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>1-tap sign-in • No passwords to remember</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>Zero plaintext email storage • DPDP compliant</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-mint font-bold">✓</span>
            <span>We never post or email without permission</span>
          </div>
        </div>
      </div>
    </main>
  );
}
