"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PublicHero, PublicShell } from "@/components/innovation/PublicShell";

export default function PartnerThanksPage() {
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
      <PublicHero eyebrow="Thank you" title={`We received your interest${name ? `, ${name}` : ""}.`}>
        The DataIsData team reviews every inquiry. If there’s a fit, you’ll get a private link to our Strategic Partner Enrollment Application by email.
      </PublicHero>
      <p className="mt-6 text-sm text-muted-foreground">
        Questions in the meantime? Email <a className="font-semibold text-primary" href="mailto:info@dataisdata.com">info@dataisdata.com</a>.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/join/partner" className="font-semibold text-primary">Submit another company</Link>
      </p>
    </PublicShell>
  );
}
