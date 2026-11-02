"use client";

import Link from "next/link";
import { BookOpen, Sparkles, Tags } from "lucide-react";
import type { Control } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getStatusColor } from "@/lib/utils";
import {
  CLASSIFICATION_FIELDS,
  NEW_COLUMNS,
  type ClassificationKey,
  activeOptions,
  displayType,
  displayValue,
  useFieldOptions,
  useIsNew,
} from "@/lib/engagementClassification";

const NONE = "__none__";

/** Where each field's definitions live in the Glossary. */
const GLOSSARY_ANCHOR: Record<ClassificationKey, string> = {
  engagement_type: "engagement-type",
  service_practice: "service-practice",
  revenue_model: "revenue-model",
  engagement_status: "engagement-status",
};

/** Small "New" pill. Renders nothing once the release window (48 hours) has passed. */
export function NewBadge({ className, until }: { className?: string; until?: string }) {
  const isNew = useIsNew(until);
  if (!isNew) return null;
  return (
    <span className={cn("new-badge", className)} title="Recently added to the portal">
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      New
    </span>
  );
}

/** Wraps a block in the soft teal "newly added" glow while the release window is open. */
export function NewHighlight({ children, className, tour }: { children: React.ReactNode; className?: string; tour?: string }) {
  const isNew = useIsNew();
  return (
    <div className={cn(isNew && "new-highlight", className)} data-tour={tour}>
      {children}
    </div>
  );
}

/**
 * The four classification dropdowns for the engagement forms (New and Edit).
 * Values not in the list (for example the existing "Staff Aug") stay selectable as
 * "(current value)" so opening and saving a record never changes it unless someone picks a new option.
 */
export function ClassificationFields({
  control,
  columnsReady,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared by two forms with different schemas
  control: Control<any>;
  columnsReady: boolean | null;
}) {
  const live = useFieldOptions();
  const fields = CLASSIFICATION_FIELDS.filter((f) => f.key === "engagement_type" || (columnsReady && NEW_COLUMNS.includes(f.key)));
  return (
    <NewHighlight className="classification-block md:col-span-2 min-w-0" tour="eng-class-fields">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Tags className="w-4 h-4 text-[var(--teal,#2f7f8c)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#1e2c40]">Engagement classification</span>
          <NewBadge />
        </div>
        {/* New tab, so unsaved form changes are never lost. */}
        <Link href="/glossary#engagement-type" target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Definitions
        </Link>
      </div>
      <p className="text-xs text-[#4f6178] mb-4">
        Type, service and revenue model are kept separate so the CRM never confuses what DataIsData is doing with how it gets paid.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <FormField
            key={f.key}
            control={control}
            name={f.key}
            render={({ field }) => {
              const current: string = field.value || "";
              const options = activeOptions(f.key, live);
              const known = options.some((o) => o.value === current);
              return (
                <FormItem className="min-w-0">
                  <FormLabel>{f.label}</FormLabel>
                  <Select value={current || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full min-w-0 overflow-hidden *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {current && !known && (
                        <SelectItem value={current}>
                          {displayValue(f.key, current) === current ? current : `${current}, shown as ${displayValue(f.key, current)}`} (current)
                        </SelectItem>
                      )}
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#4f6178]">
                    {f.key === "engagement_type" && current && displayType(current) !== current && <>Shown as {displayType(current)}. </>}
                    {f.hint}
                  </p>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        ))}
      </div>
      {columnsReady === false && (
        <p className="mt-4 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          Service / Practice, Revenue Model and Engagement Status appear here once the database update
          (supabase/2026-11-engagement-classification.sql) has been run.
        </p>
      )}
    </NewHighlight>
  );
}

type Classified = Partial<Record<ClassificationKey, string | null>>;

/** Read-only classification card for the engagement page. */
export function ClassificationCard({ engagement, columnsReady }: { engagement: Classified; columnsReady: boolean | null }) {
  const rows = CLASSIFICATION_FIELDS.filter((f) => f.key === "engagement_type" || (columnsReady && NEW_COLUMNS.includes(f.key)));
  const chips = [displayType(engagement.engagement_type), displayValue("service_practice", engagement.service_practice), displayValue("revenue_model", engagement.revenue_model)].filter(Boolean) as string[];
  return (
    <NewHighlight className="rounded-[1.125rem]" tour="eng-classification">
      <Card className="border-none shadow-sm h-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1e2c40] flex items-center gap-2">
            Classification <NewBadge />
          </CardTitle>
          <CardDescription>How DataIsData is engaged, what it delivers and how it gets paid</CardDescription>
          <Link href={`/glossary#${GLOSSARY_ANCHOR.engagement_type}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline w-fit">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> What these mean (Glossary)
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {rows.map((f, i) => {
            const raw = engagement[f.key] ?? null;
            const shown = displayValue(f.key, raw);
            return (
              <div key={f.key} className={cn("flex justify-between items-start gap-4 py-2", i < rows.length - 1 && "border-b border-slate-100")}>
                <span className="text-sm text-[#4f6178] shrink-0">{f.label}</span>
                <span className="text-right min-w-0">
                  {shown ? (
                    f.key === "engagement_status" ? (
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-md", getStatusColor(shown))}>{shown}</span>
                    ) : (
                      <span className="font-bold text-[#1e2c40] text-sm">{shown}</span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">Not set</span>
                  )}
                </span>
              </div>
            );
          })}
          {chips.length > 1 && (
            <div className="pt-3 flex flex-wrap items-center gap-1.5 text-xs">
              {chips.map((c, i) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground">+</span>}
                  <span className="classification-chip">{c}</span>
                </span>
              ))}
            </div>
          )}
          {columnsReady === false && (
            <p className="pt-2 text-xs text-amber-800">Run supabase/2026-11-engagement-classification.sql to turn on the other three fields.</p>
          )}
        </CardContent>
      </Card>
    </NewHighlight>
  );
}
