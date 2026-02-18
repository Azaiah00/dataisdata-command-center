"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[#F4F6F8]">
        <Header />
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main 
          className={cn(
            "transition-all duration-300 ease-in-out",
            "pt-16", // Space for fixed navigation
            sidebarCollapsed ? "pl-16" : "pl-64"
          )}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </TooltipProvider>
  );
}
