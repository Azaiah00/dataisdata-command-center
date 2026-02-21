"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

/** Session storage key. Once set, user stays "verified" until the tab/browser is closed. */
const PIN_VERIFIED_KEY = "did-pin-verified";

/** Correct 4-digit PIN (temporary until real auth is in place). */
const CORRECT_PIN = "7198";

interface PinGateProps {
  children: React.ReactNode;
}

/**
 * Shows a 4-digit PIN screen on first visit in a session.
 * After correct PIN, sets sessionStorage so no prompt on refresh until session ends.
 */
export function PinGate({ children }: PinGateProps) {
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // On mount (client-only), check if this session is already verified.
  useEffect(() => {
    setMounted(true);
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

  // Avoid hydration mismatch: render nothing until we've read sessionStorage.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-foreground">Enter PIN</h1>
              <p className="text-sm text-muted-foreground">
                Enter your 4-digit PIN to access the Command Center.
              </p>
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
            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            )}
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
