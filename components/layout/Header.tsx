"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Handshake,
  LayoutDashboard,
  Menu,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Rocket,
  Gauge,
  ClipboardList,
  FileCheck,
  CalendarDays,
  HardHat,
  Calculator,
  BarChart3,
  FolderOpen,
  ShieldCheck,
  Eye,
  Repeat,
  X,
  Layers,
  SquareKanban,
  Landmark,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/components/auth/AccessProvider";
import { BrandMark } from "@/components/brand/BrandMark";
import { initials, RoleBadge } from "@/components/auth/LoginScreen";
import { NotificationsMenu } from "./NotificationsMenu";
import type { ModuleKey } from "@/lib/access/modules";
import { ROLE_LABELS } from "@/lib/access/types";
import { Wordmark } from "@/components/brand/Wordmark";
import { Icon3D } from "@/components/ui/icon-3d";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "Account" | "Contact" | "Opportunity" | "Engagement" | "Partner" | "Contractor" | "Invoice";
};

type NavItem = { path: string; label: string; icon: React.ElementType; module: ModuleKey };

const crmItems: NavItem[] = [
  { path: "/accounts", label: "Accounts", icon: Building2, module: "accounts" },
  { path: "/contacts", label: "Contacts", icon: Users, module: "contacts" },
  { path: "/partners", label: "Partners", icon: Handshake, module: "partners" },
  { path: "/contractors", label: "Contractors", icon: HardHat, module: "contractors" },
];

const workItems: NavItem[] = [
  { path: "/engagements", label: "Engagements", icon: Briefcase, module: "engagements" },
  { path: "/activities", label: "Activities", icon: Calendar, module: "activities" },
  { path: "/pipeline", label: "Pipeline", icon: TrendingUp, module: "pipeline" },
];

const financeItems: NavItem[] = [
  { path: "/finance", label: "Finance Dashboard", icon: DollarSign, module: "finance_dashboard" },
  { path: "/finance/tracker", label: "Finance Tracker", icon: Calculator, module: "finance_tracker" },
  { path: "/finance/invoices", label: "Invoices", icon: Receipt, module: "invoices" },
  { path: "/finance/expenses", label: "Expenses", icon: CreditCard, module: "expenses" },
  { path: "/finance/payments", label: "Payments", icon: Banknote, module: "payments" },
  { path: "/finance/pnl", label: "Profit & Loss", icon: TrendingUp, module: "pnl" },
];

const innovationItems: NavItem[] = [
  { path: "/innovation/exchange", label: "Vendor & Event Module", icon: Layers, module: "innovation_exchange" },
  { path: "/innovation/vendor-pipeline", label: "Vendor Pipeline", icon: SquareKanban, module: "vendor_inquiries" },
  { path: "/innovation", label: "Executive Portfolio", icon: Rocket, module: "innovation_portfolio" },
  { path: "/innovation/maturity", label: "Maturity Index", icon: Gauge, module: "innovation_maturity" },
  { path: "/innovation/vendor-inquiry", label: "Vendor Inquiries", icon: ClipboardList, module: "vendor_inquiries" },
  { path: "/innovation/vendor-application", label: "Vendor Applications", icon: FileCheck, module: "vendor_applications" },
  { path: "/innovation/events", label: "Events", icon: CalendarDays, module: "events" },
  { path: "/innovation/client-intake", label: "Client Intake", icon: Building2, module: "client_intake" },
];

const insightItems: NavItem[] = [
  { path: "/reports", label: "Reports", icon: BarChart3, module: "reports" },
  { path: "/documents", label: "Documents", icon: FolderOpen, module: "documents" },
];

const portalItems: NavItem[] = [
  { path: "/portal/city", label: "My Innovation Portal", icon: Landmark, module: "client_portal" },
  { path: "/portal/partner", label: "My Partner Portal", icon: Handshake, module: "partner_portal" },
];

const SECTIONS: { label: string; items: NavItem[]; prefixes: string[] }[] = [
  { label: "CRM", items: crmItems, prefixes: ["/accounts", "/contacts", "/partners", "/contractors"] },
  { label: "Work", items: workItems, prefixes: ["/engagements", "/activities", "/pipeline"] },
  { label: "Finance", items: financeItems, prefixes: ["/finance"] },
  { label: "Innovation", items: innovationItems, prefixes: ["/innovation"] },
  { label: "Insights", items: insightItems, prefixes: ["/reports", "/documents"] },
  { label: "My Portal", items: portalItems, prefixes: ["/portal"] },
];

function isActivePath(pathname: string | null, path: string) {
  if (!pathname) return false;
  if (path === "/finance" || path === "/innovation") return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

function NavLink({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon?: React.ElementType; active?: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cn("side-link", active && "is-active")}>
      {Icon && <Icon3D icon={Icon} tone={active ? "teal" : "silver"} />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function currentTitle(pathname: string | null, sections: { items: NavItem[] }[]) {
  if (!pathname || pathname === "/") return "Dashboard";
  let best: NavItem | null = null;
  for (const sec of sections)
    for (const it of sec.items)
      if ((pathname === it.path || pathname.startsWith(it.path + "/")) && (!best || it.path.length > best.path.length)) best = it;
  if (best) return best.label;
  if (pathname.startsWith("/admin")) return "Users & Permissions";
  if (pathname.startsWith("/settings")) return "Profile & My View";
  return "DataIsData";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, realUser, canSee, can, isAdmin, isRealAdmin, isPreviewing, users, startPreview, stopPreview, signOut, authMode } =
    useAccess();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // "My Portal" is for outside city / vendor logins; the team reaches portals through Preview.
  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => canSee(i.module)) }))
    .filter((s) => s.items.length)
    .filter((s) => s.label !== "My Portal" || user?.seat_role === "guest");
  const showDashboard = canSee("dashboard");

  const searchable = {
    accounts: can("accounts"),
    contacts: can("contacts"),
    pipeline: can("pipeline"),
    engagements: can("engagements"),
    partners: can("partners"),
    contractors: can("contractors"),
    invoices: can("invoices"),
  };
  const canSearch = Object.values(searchable).some(Boolean);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const term = query.replace(/[%,()]/g, " ");

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const empty = Promise.resolve({ data: [] as never[] });
      const [accountsRes, contactsRes, opportunitiesRes, engagementsRes, partnersRes, contractorsRes, invoicesRes] = await Promise.all([
        searchable.accounts ? supabase.from("accounts").select("id, name, account_type").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.contacts ? supabase.from("contacts").select("id, full_name, title_role").or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(4) : empty,
        searchable.pipeline ? supabase.from("opportunities").select("id, name, stage").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.engagements ? supabase.from("engagements").select("id, name, status").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.partners ? supabase.from("partners").select("id, name, partner_type").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.contractors ? supabase.from("contractors").select("id, full_name, title_role").ilike("full_name", `%${term}%`).limit(4) : empty,
        searchable.invoices ? supabase.from("invoices").select("id, invoice_number, status").ilike("invoice_number", `%${term}%`).limit(4) : empty,
      ]);

      const next: SearchItem[] = [];
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (accountsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.account_type || "Account", href: `/accounts/${i.id}`, type: "Account" }));
      (contactsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.full_name, subtitle: i.title_role || "Contact", href: `/contacts/${i.id}`, type: "Contact" }));
      (opportunitiesRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.stage || "Opportunity", href: `/pipeline/${i.id}`, type: "Opportunity" }));
      (engagementsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.status || "Engagement", href: `/engagements/${i.id}`, type: "Engagement" }));
      (partnersRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.partner_type || "Partner", href: `/partners/${i.id}`, type: "Partner" }));
      (contractorsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.full_name, subtitle: i.title_role || "Contractor", href: `/contractors/${i.id}`, type: "Contractor" }));
      (invoicesRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.invoice_number, subtitle: i.status || "Invoice", href: `/finance/invoices/${i.id}`, type: "Invoice" }));
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setSearchResults(next.slice(0, 14));
      setSearchOpen(true);
      setSearchLoading(false);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, user?.id]);


  const searchBox = (className: string) => (
    <div ref={searchContainerRef} className={cn("items-center relative", className)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        aria-label="Search the portal"
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (searchResults.length > 0 || searchQuery.trim().length >= 2) setSearchOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && searchResults.length > 0) {
            router.push(searchResults[0].href);
            setSearchOpen(false);
            setMobileSearchOpen(false);
          }
          if (e.key === "Escape") setSearchOpen(false);
        }}
        className="search-field"
      />
      {searchOpen && (
        <div className="absolute top-12 right-0 w-full min-w-[18rem] rounded-2xl border border-[#d3dce5] bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_-24px_rgba(24,32,47,0.4)] z-50 overflow-hidden">
          {searchLoading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(result.href);
                    setSearchOpen(false);
                    setMobileSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.type} • {result.subtitle}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">No results found.</div>
          )}
        </div>
      )}
    </div>
  );

  const previewTargets = users.filter((u) => u.id !== realUser?.id && u.status === "active");

  const navList = (close?: () => void) => (
    <>
      {showDashboard && <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} onClick={close} />}
      {sections.map((section) => (
        <div key={section.label}>
          <p className="side-section">{section.label}</p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.path} href={item.path} label={item.label} icon={item.icon} active={isActivePath(pathname, item.path)} onClick={close} />
            ))}
          </div>
        </div>
      ))}
      {isAdmin && (
        <div>
          <p className="side-section">Admin</p>
          <NavLink href="/admin/users" label="Users & Permissions" icon={ShieldCheck} active={pathname?.startsWith("/admin")} onClick={close} />
          <NavLink href="/settings" label="Settings" icon={Settings} active={pathname?.startsWith("/settings")} onClick={close} />
        </div>
      )}
    </>
  );

  const title = currentTitle(pathname, sections);

  return (
    <>
      {/* Desktop: frosted sidebar */}
      <aside className="app-sidebar hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col print:hidden" aria-label="Main navigation">
        <Link href={showDashboard ? "/" : sections[0]?.items[0]?.path || "/"} className="flex items-center gap-3 px-6 h-20 shrink-0" aria-label="DataIsData home">
          <BrandMark size={36} />
          <span className="leading-tight">
            <Wordmark onDark className="block text-[1.15rem]" />
            <span className="block text-[11px] font-medium text-muted-foreground">Command Center</span>
          </span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 sidebar-scroll">{navList()}</nav>
        <div className="p-3 border-t border-white/10">
          <div className="sidebar-user flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={cn("text-white text-xs", isPreviewing ? "bg-amber-500" : "bg-gradient-to-br from-[#6c63b5] to-[#22566a]")}>
                {initials(realUser?.full_name || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{realUser?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{realUser ? ROLE_LABELS[realUser.seat_role] : ""}</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="app-topbar fixed top-0 right-0 left-0 lg:left-64 z-30 h-16 print:hidden">
        <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8 max-w-[90rem] mx-auto gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground -ml-2" aria-label="Open menu">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 app-sidebar">
                <SheetHeader className="px-6 h-20 justify-center border-b border-white/10 text-left">
                  <SheetTitle className="flex items-center gap-2.5">
                    <BrandMark size={32} />
                    <Wordmark onDark />
                  </SheetTitle>
                </SheetHeader>
                <nav className="px-3 py-3 overflow-y-auto h-[calc(100dvh-5rem)] sidebar-scroll">{navList(() => setIsMobileMenuOpen(false))}</nav>
              </SheetContent>
            </Sheet>
            <Link href={showDashboard ? "/" : sections[0]?.items[0]?.path || "/"} className="lg:hidden shrink-0" aria-label="DataIsData home">
              <BrandMark size={30} />
            </Link>
            <span className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {canSearch && searchBox("hidden md:flex w-56 xl:w-72")}

            {canSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground md:hidden"
                aria-label="Search"
                onClick={() => setMobileSearchOpen((v) => !v)}
              >
                {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </Button>
            )}

            <div className="topbar-icon">
              <NotificationsMenu />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-1 pl-1 rounded-full hover:bg-white/70" aria-label="Account menu">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarFallback className={cn("text-white text-xs", isPreviewing ? "bg-amber-500" : "bg-gradient-to-br from-[#6c63b5] to-[#22566a]")}>
                      {initials(realUser?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-1">
                  <span className="block text-sm font-semibold">{realUser?.full_name}</span>
                  <span className="block text-xs font-normal text-muted-foreground truncate">{realUser?.email || "No email on file"}</span>
                  {realUser && <RoleBadge role={realUser.seat_role} />}
                  {isPreviewing && user && <span className="block text-[11px] font-normal text-amber-700">Viewing as {user.full_name}</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" /> Profile & My View
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Users & Permissions
                    </Link>
                  </DropdownMenuItem>
                )}
                {isRealAdmin && previewTargets.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Eye className="w-4 h-4 mr-2" /> Preview as…
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {previewTargets.map((u) => (
                        <DropdownMenuItem key={u.id} onClick={() => startPreview(u.id)}>
                          <span className="truncate">{u.full_name}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{ROLE_LABELS[u.seat_role]}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {isPreviewing && (
                  <DropdownMenuItem onClick={stopPreview}>
                    <Eye className="w-4 h-4 mr-2" /> Exit preview
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {authMode === "demo" && (
                  <DropdownMenuItem onClick={() => signOut()}>
                    <Repeat className="w-4 h-4 mr-2" /> Switch demo user
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {mobileSearchOpen && canSearch && (
          <div className="md:hidden absolute top-16 left-0 right-0 app-topbar p-3">
            {searchBox("flex w-full")}
          </div>
        )}
      </header>
    </>
  );
}
