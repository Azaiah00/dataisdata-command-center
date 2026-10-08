"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { AUTH_MODE } from "./AccessProvider";

/** Session storage key. Once set, user stays "verified" until the tab/browser is closed. */
const PIN_VERIFIED_KEY = "did-pin-verified";

/** Correct 4-digit PIN (outer gate during the demo-login phase). */
const CORRECT_PIN = "2345";

interface PinGateProps {
  children: React.ReactNode;
}

/**
 * Outer gate for the demo-login phase: a 4-digit PIN, then the seat picker.
 * Automatically disabled when NEXT_PUBLIC_AUTH_MODE=google (real sign-in replaces it).
 */
export function PinGate({ children }: PinGateProps) {
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    if (AUTH_MODE === "google") {
      setUnlocked(true);
      return;
    }
    if (typeof window !== "undefined" && sessionStorage.getItem(PIN_VERIFIED_KEY) === "true") {
      setUnlocked(true);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(PIN_VERIFIED_KEY, "true");
      setUnlocked(true);
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-brand-green-bright/30 blur-3xl pointer-events-none" />
        <div className="w-full max-w-sm space-y-6 relative rounded-3xl bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-3">
            <BrandMark size={64} rounded="rounded-2xl" />
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">DataIsData Command Center</p>
              <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Enter PIN
              </h1>
              <p className="text-sm text-muted-foreground">Enter the 4-digit team PIN to continue to sign-in.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                setError("");
              }}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              autoFocus
              autoComplete="off"
              aria-label="4-digit PIN"
            />
            {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={pin.length !== 4}>
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
