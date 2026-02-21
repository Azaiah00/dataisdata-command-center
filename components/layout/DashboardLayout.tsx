"use client";

import { Header } from "./Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PinGate } from "@/components/auth/PinGate";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <PinGate>
        <div className="min-h-screen bg-background">
          <Header />
          
          <main 
            className="transition-all duration-300 ease-in-out pt-16"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
          <Toaster position="top-right" />
        </div>
      </PinGate>
    </TooltipProvider>
  );
}
