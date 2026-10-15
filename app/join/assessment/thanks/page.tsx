"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PublicHero, PublicShell } from "@/components/innovation/PublicShell";

export default function AssessmentThanksPage() {
  const name = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem("did-join-name") || "";
      } catch {
        return "";
      }
    },
    () => ""
  );
  return (
    <PublicShell>
      <PublicHero eyebrow="Assessment received" title={`Thank you${name ? `, ${name}` : ""}.`}>
        DataIsData will review your assessment and follow up within five business days with a readiness review and next steps.
      </PublicHero>
      <p className="mt-6 text-sm text-muted-foreground">
        Questions in the meantime? Email <a className="font-semibold text-primary" href="mailto:info@dataisdata.com">info@dataisdata.com</a>.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/join/assessment" className="font-semibold text-primary">Submit another assessment</Link>
      </p>
    </PublicShell>
  );
}
