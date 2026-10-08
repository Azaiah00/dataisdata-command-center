"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, AlertTriangle, Clock, Receipt, CalendarClock, UserMinus, Hourglass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/components/auth/AccessProvider";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { todayISO, addDaysISO } from "@/lib/finance/dates";

export interface PortalNotification {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warning" | "info";
  icon: React.ElementType;
  sortKey: string;
}

const SEEN_KEY = "did-notifications-seen";

/**
 * Real, permission-aware notifications computed from live data across the
 * portal (finance, pipeline, activities, engagements, tracker).
 */
export function NotificationsMenu() {
  const { can, user } = useAccess();
  const pathname = usePathname();
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(`${SEEN_KEY}-${user?.id}`) || "[]"));
    } catch {
      setSeen([]);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const today = todayISO();
      const in7 = addDaysISO(today, 7);
      const in30 = addDaysISO(today, 30);
      const weekAgo = addDaysISO(today, -7);
      const out: PortalNotification[] = [];
      const tasks: Promise<void>[] = [];

      if (can("invoices")) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("invoices")
              .select("id, invoice_number, total, due_date, status, issue_date, accounts(name)")
              .in("status", ["Sent", "Overdue", "Draft"]);
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (data || []).forEach((inv: any) => {
              const acct = Array.isArray(inv.accounts) ? inv.accounts[0]?.name : inv.accounts?.name;
              if ((inv.status === "Sent" || inv.status === "Overdue") && inv.due_date && inv.due_date < today) {
                out.push({
                  id: `inv-overdue-${inv.id}-${inv.due_date}`,
                  title: `${inv.invoice_number} is past due`,
                  detail: `${formatCurrency(inv.total)} · ${acct || "Account"} · due ${formatDate(inv.due_date)}`,
                  href: `/finance/invoices/${inv.id}`,
                  tone: "critical",
                  icon: AlertTriangle,
                  sortKey: `0-${inv.due_date}`,
                });
              } else if (inv.status === "Draft" && inv.issue_date && inv.issue_date <= weekAgo) {
                out.push({
                  id: `inv-draft-${inv.id}`,
                  title: `Draft ${inv.invoice_number} hasn't been sent`,
                  detail: `${formatCurrency(inv.total)} · ${acct || "Account"} · created ${formatDate(inv.issue_date)}`,
                  href: `/finance/invoices/${inv.id}`,
                  tone: "warning",
                  icon: Receipt,
                  sortKey: `2-${inv.issue_date}`,
                });
              }
            });
          })()
        );
      }

      if (can("activities")) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("activities")
              .select("id, next_action, next_action_due, accounts(name)")
              .not("next_action_due", "is", null)
              .lte("next_action_due", in7);
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (data || []).forEach((a: any) => {
              if (!a.next_action) return;
              const acct = Array.isArray(a.accounts) ? a.accounts[0]?.name : a.accounts?.name;
              const overdue = a.next_action_due < today;
              out.push({
                id: `act-${a.id}-${a.next_action_due}`,
                title: overdue ? `Overdue follow-up: ${a.next_action}` : `Follow-up due ${formatDate(a.next_action_due)}`,
                detail: `${overdue ? "" : a.next_action + " · "}${acct || "Account"}`,
                href: `/activities`,
                tone: overdue ? "warning" : "info",
                icon: Clock,
                sortKey: `${overdue ? 1 : 3}-${a.next_action_due}`,
              });
            });
          })()
        );
      }

      if (can("pipeline")) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("opportunities")
              .select("id, name, next_step, next_step_due, stage")
              .not("next_step_due", "is", null)
              .lte("next_step_due", in7)
              .not("stage", "in", "(Awarded,Lost)");
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (data || []).forEach((o: any) => {
              const overdue = o.next_step_due < today;
              out.push({
                id: `opp-${o.id}-${o.next_step_due}`,
                title: `${o.name}: ${o.next_step || "next step"}`,
                detail: `${o.stage} · ${overdue ? "overdue since" : "due"} ${formatDate(o.next_step_due)}`,
                href: `/pipeline/${o.id}`,
                tone: overdue ? "warning" : "info",
                icon: CalendarClock,
                sortKey: `${overdue ? 1 : 3}-${o.next_step_due}`,
              });
            });
          })()
        );
      }

      if (can("engagements")) {
        tasks.push(
          (async () => {
            const { data } = await supabase
              .from("engagements")
              .select("id, name, end_date, status")
              .eq("status", "In Progress")
              .not("end_date", "is", null)
              .lte("end_date", in30);
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (data || []).forEach((e: any) => {
              const ended = e.end_date < today;
              out.push({
                id: `eng-${e.id}-${e.end_date}`,
                title: ended ? `${e.name} passed its end date` : `${e.name} ends ${formatDate(e.end_date)}`,
                detail: ended ? "Still marked In Progress — extend it or mark Complete." : "Plan the extension or next placement now.",
                href: `/engagements/${e.id}`,
                tone: ended ? "warning" : "info",
                icon: Hourglass,
                sortKey: `${ended ? 1 : 4}-${e.end_date}`,
              });
            });
          })()
        );
      }

      if (can("finance_tracker")) {
        tasks.push(
          (async () => {
            const { data, error } = await supabase
              .from("placements")
              .select("id, role_title, end_date, status, contractors(full_name)")
              .eq("status", "Active")
              .not("end_date", "is", null)
              .lte("end_date", in30);
            if (error) return;
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (data || []).forEach((p: any) => {
              const name = Array.isArray(p.contractors) ? p.contractors[0]?.full_name : p.contractors?.full_name;
              out.push({
                id: `pl-${p.id}-${p.end_date}`,
                title: `Placement ending: ${name || p.role_title}`,
                detail: `${p.role_title} · ends ${formatDate(p.end_date)} — line up an extension or redeploy.`,
                href: `/finance/tracker?tab=placements`,
                tone: p.end_date < today ? "warning" : "info",
                icon: UserMinus,
                sortKey: `2-${p.end_date}`,
              });
            });
            const hrs = await supabase.from("placement_hours").select("id, hours, bill_rate").is("invoice_id", null);
            if (!hrs.error && hrs.data && hrs.data.length) {
              const value = hrs.data.reduce((s: number, h: { hours: number; bill_rate: number }) => s + (h.hours || 0) * (h.bill_rate || 0), 0);
              out.push({
                id: `hours-unbilled-${hrs.data.length}-${Math.round(value)}`,
                title: `${hrs.data.length} timesheet${hrs.data.length === 1 ? "" : "s"} not invoiced`,
                detail: `${formatCurrency(value)} of billable time is waiting to be invoiced.`,
                href: `/finance/tracker?tab=hours`,
                tone: "warning",
                icon: Receipt,
                sortKey: `1-unbilled`,
              });
            }
          })()
        );
      }

      await Promise.all(tasks.map((t) => t.catch(() => undefined)));
      if (!cancelled) setItems(out.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(0, 25));
    }
    load();
    return () => {
      cancelled = true;
    };
    // Re-evaluate when the user navigates (data may have changed).
  }, [can, pathname]);

  const unseen = useMemo(() => items.filter((i) => !seen.includes(i.id)), [items, seen]);

  function markAllSeen() {
    const next = Array.from(new Set([...seen, ...items.map((i) => i.id)])).slice(-500);
    setSeen(next);
    try {
      localStorage.setItem(`${SEEN_KEY}-${user?.id}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && unseen.length && markAllSeen()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label={`Notifications${unseen.length ? ` (${unseen.length} new)` : ""}`}>
          <Bell className="w-5 h-5" />
          {unseen.length > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center bg-brand-green-bright text-white text-[10px] font-bold">
              {unseen.length > 9 ? "9+" : unseen.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <span className="text-[10px] font-medium text-muted-foreground">{items.length} active</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 text-primary" /> You&apos;re all caught up.
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                className={cn(
                  "flex gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted",
                  !seen.includes(n.id) && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    n.tone === "critical" ? "bg-red-50 text-red-600" : n.tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary"
                  )}
                >
                  <n.icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground leading-snug">{n.title}</span>
                  <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{n.detail}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
