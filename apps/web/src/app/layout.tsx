import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaProvider } from "@/components/providers/PwaProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { WebVitals } from "@/components/analytics/WebVitals";
import { BottomNav } from "@/components/ui/BottomNav";
import { DemoBanner } from "@/components/ui/DemoBanner";
import "../styles/globals.css";

const LoginModal = dynamic(
  () => import("@/components/auth/LoginModal").then((m) => m.LoginModal),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "oddly — Someone out there is oddly like you",
  description: "Five picks. About 30 seconds. One stranger twin anywhere in the world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-cream text-ink antialiased min-h-screen">
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              <PwaProvider>
                <MotionProvider>
                  <DemoBanner />
                  <WebVitals />
                  {children}
                  <BottomNav />
                  <LoginModal />
                </MotionProvider>
              </PwaProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
