"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export interface AuthAccount {
  id: string;
  displayName: string;
  emailHash?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AuthAccount | null;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithGoogleToken: (idToken: string, turnstileToken?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { toast, success, error, info } = useToast();

  const refreshSession = useCallback(async () => {
    try {
      const res = await api.auth.getSession();
      if (res && res.authenticated && res.account) {
        setIsAuthenticated(true);
        setAccount({
          id: res.account.id,
          displayName: res.account.displayName,
          emailHash: res.account.emailHash,
        });
      } else {
        setIsAuthenticated(false);
        setAccount(null);
      }
    } catch {
      setIsAuthenticated(false);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  const loginWithGoogleToken = useCallback(
    async (idToken: string, turnstileToken?: string) => {
      try {
        const res = await api.auth.login(idToken, turnstileToken);
        if (res && res.ok && res.account) {
          setIsAuthenticated(true);
          setAccount({
            id: res.account.id,
            displayName: res.account.displayName,
            emailHash: res.account.emailHash,
          });

          // Attempt to merge guest history if DID exists
          let guestDid = "";
          try {
            guestDid = localStorage.getItem("oddly_did") || "";
          } catch {
            // ignore
          }

          if (guestDid) {
            try {
              await api.auth.merge({ guest_did: guestDid });
            } catch {
              // Non-blocking merge error
            }
          }

          success(`Welcome, ${res.account.displayName}! Your streaks are synced.`);
          closeLoginModal();
          return { ok: true };
        }
        return { ok: false, error: (res as any)?.message || "Authentication failed" };
      } catch (err: any) {
        const message = err?.message || "Login failed. Please try again.";
        error(message);
        return { ok: false, error: message };
      }
    },
    [closeLoginModal, success, error]
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setAccount(null);
      info("Signed out. You are playing as a guest.");
    }
  }, [info]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        account,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginWithGoogleToken,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
