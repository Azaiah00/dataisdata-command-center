"use client";

import { Header } from "./Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PinGate } from "@/components/auth/PinGate";
import { AccessProvider, useAccess } from "@/components/auth/AccessProvider";
import { LoginScreen, BlockedScreen, RoleBadge } from "@/components/auth/LoginScreen";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/button";
import { Eye, DatabaseZap } from "lucide-react";
import Link from "next/link";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function PreviewBanner() {
  const { isPreviewing, user, stopPreview } = useAccess();
  if (!isPreviewing || !user) return null;
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-amber-400 text-amber-950 print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium truncate">
          <Eye className="w-4 h-4 shrink-0" />
          Previewing as <strong>{user.full_name}</strong>
          <RoleBadge role={user.seat_role} className="bg-amber-950/10 text-amber-950" />
          <span className="hidden md:inline">— this is exactly what they can see and do.</span>
        </span>
        <Button size="sm" variant="secondary" className="h-7 bg-amber-950 text-amber-50 hover:bg-amber-900" onClick={stopPreview}>
          Exit preview
        </Button>
      </div>
    </div>
  );
}

function SetupBanner() {
  const { storageMode, isRealAdmin, isPreviewing } = useAccess();
  if (storageMode !== "local" || !isRealAdmin || isPreviewing) return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center gap-3 justify-between print:hidden">
      <span className="flex items-start gap-2">
        <DatabaseZap className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Seat tables not installed yet.</strong> Seats and permissions are saved in this browser only until the
          October 2026 SQL migration is run in Supabase.
        </span>
      </span>
      <Link href="/admin/users" className="font-semibold underline whitespace-nowrap">
        Open Users & Permissions
      </Link>
    </div>
  );
}

function Shell({ children }: DashboardLayoutProps) {
  const { status, user, isPreviewing } = useAccess();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (status === "signedOut") return <LoginScreen />;
  if (status === "unauthorized" || status === "suspended" || status === "error") return <BlockedScreen kind={status} />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PreviewBanner />
      <main className={isPreviewing ? "transition-all duration-300 ease-in-out pt-26 print:pt-0" : "transition-all duration-300 ease-in-out pt-16 print:pt-0"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SetupBanner />
          {/* Remount pages when the effective user changes so every query re-runs with the right access. */}
          <RouteGuard key={user?.id || "anon"}>{children}</RouteGuard>
        </div>
      </main>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <PinGate>
        <AccessProvider>
          <Shell>{children}</Shell>
        </AccessProvider>
      </PinGate>
      <Toaster position="top-right" />
    </TooltipProvider>
  );
}
