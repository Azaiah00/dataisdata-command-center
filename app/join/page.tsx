"use client";

import Link from "next/link";
import { ArrowRight, Building2, Handshake } from "lucide-react";
import { PublicHero, PublicShell } from "@/components/innovation/PublicShell";

export default function JoinPage() {
  return (
    <PublicShell>
      <PublicHero eyebrow="DataIsData Innovation Partners" title="Connecting proven technology with the localities that need it.">
        DataIsData curates showcase events and partnerships between vetted vendors and Virginia cities, counties and agencies.
      </PublicHero>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { href: "/join/partner", icon: Handshake, title: "I’m a vendor", body: "Tell us about your company. If there’s a fit, we’ll invite you to apply.", cta: "Partner interest form" },
          { href: "/join/assessment", icon: Building2, title: "I’m a locality", body: "Share your top technology challenges and get a readiness review.", cta: "Innovation Assessment" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-3xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary"><c.icon className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold text-foreground">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">{c.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </div>
    </PublicShell>
  );
}
