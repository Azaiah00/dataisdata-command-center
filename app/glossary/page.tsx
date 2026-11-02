"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import { NewBadge, NewHighlight } from "@/components/engagements/Classification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { classificationGlossary, GLOSSARY } from "@/lib/glossary";
import { useFieldOptions } from "@/lib/engagementClassification";
import { cn } from "@/lib/utils";

/** Portal glossary: definitions for every classification, status and scoring term, searchable. */
export default function GlossaryPage() {
  const { can, isAdmin } = useAccess();
  const [query, setQuery] = useState("");

  // Only the sections for modules this seat can open.
  const live = useFieldOptions();
  const sections = useMemo(
    () => [...classificationGlossary(live), ...GLOSSARY].filter((s) => s.modules.some((m) => can(m))),
    [can, live]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        terms: s.title.toLowerCase().includes(q)
          ? s.terms
          : s.terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)),
      }))
      .filter((s) => s.terms.length);
  }, [sections, query]);

  const total = sections.reduce((t, s) => t + s.terms.length, 0);

  // Links like /glossary#engagement-type land on that section once it has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            Glossary <NewBadge />
          </span>
        }
        description={`What each classification, status and scoring term in the Command Center means. ${total} terms.`}
        actions={
          isAdmin ? (
            <Link href="/admin/field-options">
              <Button variant="outline">
                <ListChecks className="w-4 h-4" /> Edit classification choices
              </Button>
            </Link>
          ) : undefined
        }
      />

      <NewHighlight className="classification-block" tour="glossary">
        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms or definitions"
              aria-label="Search the glossary"
              className="search-field"
            />
          </div>
          <nav aria-label="Glossary sections" className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="filter-pill">
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </NewHighlight>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No terms match &ldquo;{query}&rdquo;.</p>
      )}

      <div className="space-y-6">
        {visible.map((s) => (
          <Card key={s.id} id={s.id} className="border-none shadow-sm scroll-mt-28">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#1e2c40] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
                {s.title}
              </CardTitle>
              {s.intro && <CardDescription>{s.intro}</CardDescription>}
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-slate-100">
                {s.terms.map((t, i) => (
                  <div key={t.term} className={cn("grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_1fr] gap-x-6 gap-y-1 py-3", i === 0 && "pt-0")}>
                    <dt className="text-sm font-semibold text-[#1e2c40]">{t.term}</dt>
                    <dd className="text-sm text-[#4f6178]">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
