"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { ReportModal } from "@/components/ui/ReportModal";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Shield,
  Download,
  Trash2,
  Flag,
  FileText,
  Info,
  LogOut,
  User,
  CheckCircle2,
} from "lucide-react";

export default function MePage() {
  const router = useRouter();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.me.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oddly-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data archive has been downloaded", "success");
    } catch {
      toast("Failed to export data. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.me.deleteAccount();
      await auth.logout();
      setShowDeleteConfirm(false);
      toast("Your account and data have been erased", "info");
      router.push("/");
    } catch {
      toast("Failed to erase account. Please contact privacy@oddly.app", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col p-4 sm:p-6 max-w-xl mx-auto pb-16">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between py-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-text-muted hover:text-text pl-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Button>

        <h1 className="font-heading text-lg font-bold text-text">
          Me &amp; Settings
        </h1>

        <div className="w-12" />
      </header>

      <div className="relative z-20 space-y-6">
        {/* Account Profile Card */}
        <Card variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet/20 border border-violet/40 flex items-center justify-center text-violet font-heading font-bold text-lg">
                {auth.isAuthenticated
                  ? auth.account?.displayName?.charAt(0).toUpperCase() || "P"
                  : "?"}
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-text">
                  {auth.isAuthenticated
                    ? auth.account?.displayName
                    : "Guest Player"}
                </h3>
                <p className="text-xs text-text-muted">
                  {auth.isAuthenticated
                    ? "Signed in with Google"
                    : "Picks stored on this device"}
                </p>
              </div>
            </div>

            {auth.isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => auth.logout()}
                className="text-text-muted hover:text-flame flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs">Sign out</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => auth.openLoginModal()}
                className="flex items-center gap-1.5 text-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Button>
            )}
          </div>

          {auth.isAuthenticated && (
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>DPDP Identity Protection</span>
              <span className="font-mono text-[11px] text-mint flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero Plaintext Email</span>
              </span>
            </div>
          )}
        </Card>

        {/* Rituals & Notification Preferences */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Rituals &amp; Reminders
          </h2>

          <Card variant="default" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-text flex items-center gap-2">
                  <Bell className="w-4 h-4 text-violet" />
                  <span>Daily Drop at 07:00 IST</span>
                </div>
                <p className="text-xs text-text-muted">
                  Get notified when the daily five picks open
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-5 h-5 rounded accent-violet cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-text flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Quiet Hours (22:00 – 07:00)</span>
                </div>
                <p className="text-xs text-text-muted">
                  Mute all game alerts during sleeping hours
                </p>
              </div>
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="w-5 h-5 rounded accent-violet cursor-pointer"
              />
            </div>
          </Card>
        </div>

        {/* Display Theme */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Appearance
          </h2>

          <Card variant="default" className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-text flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-text" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>Color Theme</span>
              </div>
              <p className="text-xs text-text-muted">
                {theme === "dark" ? "Atmosphere Midnight Dark" : "Daylight Clean"}
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Switch to {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </Card>
        </div>

        {/* DPDP Privacy & Legal Rights */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Privacy &amp; Data Rights (DPDP)
          </h2>

          <Card variant="default" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-text flex items-center gap-2">
                  <Download className="w-4 h-4 text-mint" />
                  <span>Download My Data (Portability)</span>
                </div>
                <p className="text-xs text-text-muted">
                  Export all picks, sealed twins, and streaks as JSON
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                isLoading={isExporting}
              >
                Export
              </Button>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-flame flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-flame" />
                  <span>Erase Account (Right to Erasure)</span>
                </div>
                <p className="text-xs text-text-muted">
                  Permanently disassociate all history and remove account
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Erase
              </Button>
            </div>
          </Card>
        </div>

        {/* Transparency & Community Guidelines */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            About &amp; Safety
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push("/about")}
              className="flex items-center justify-start gap-2 text-xs"
            >
              <Info className="w-4 h-4 text-text-muted" />
              <span>About Oddly</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push("/privacy")}
              className="flex items-center justify-start gap-2 text-xs"
            >
              <Shield className="w-4 h-4 text-text-muted" />
              <span>Privacy Notice</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push("/terms")}
              className="flex items-center justify-start gap-2 text-xs"
            >
              <FileText className="w-4 h-4 text-text-muted" />
              <span>Terms of Service</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-start gap-2 text-xs"
            >
              <Flag className="w-4 h-4 text-flame" />
              <span>Report an Issue</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-midnight/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-flame/15 mx-auto flex items-center justify-center text-flame">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-text">
                Permanently erase your account?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                This will disassociate all your daily picks, twin pairings, and streaks under the DPDP Right to Erasure. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-1/2 text-text-muted hover:text-text"
              >
                Keep Account
              </Button>
              <Button
                variant="destructive"
                size="md"
                onClick={handleDeleteAccount}
                isLoading={isDeleting}
                className="w-1/2"
              >
                Yes, Erase All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        targetType="other"
      />
    </main>
  );
}
