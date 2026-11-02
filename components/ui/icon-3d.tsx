import {
  Banknote,
  BookOpen,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileCheck,
  FileSignature,
  FolderOpen,
  Gauge,
  Globe,
  HardHat,
  Handshake,
  Landmark,
  Layers,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Rocket,
  Settings,
  ShieldCheck,
  SquareKanban,
  Target,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rendered 3D clay icons (public/icons3d/<tone>/<slug>.png), generated to match
 * the frosted-clay reference. Any icon without a 3D version falls back to the
 * regular line icon, so nothing ever disappears.
 */
const SLUGS = new Map<React.ElementType, string>([
  [LayoutDashboard, "dashboard"],
  [Building2, "building"],
  [Users, "users"],
  [Handshake, "handshake"],
  [HardHat, "hardhat"],
  [Briefcase, "briefcase"],
  [Calendar, "calendar"],
  [TrendingUp, "trending-up"],
  [DollarSign, "dollar"],
  [Calculator, "calculator"],
  [Receipt, "receipt"],
  [CreditCard, "credit-card"],
  [Banknote, "banknote"],
  [Layers, "layers"],
  [SquareKanban, "kanban"],
  [Rocket, "rocket"],
  [Gauge, "gauge"],
  [ClipboardList, "clipboard-list"],
  [FileCheck, "file-check"],
  [CalendarDays, "calendar-days"],
  [BarChart3, "bar-chart"],
  [FolderOpen, "folder-open"],
  [Landmark, "landmark"],
  [Target, "target"],
  [FileSignature, "file-signature"],
  [Wallet, "wallet"],
  [ShieldCheck, "shield-check"],
  [PiggyBank, "piggy-bank"],
  [Timer, "timer"],
  [Globe, "globe"],
  [Settings, "settings"],
  [Bell, "bell"],
  // No dedicated 3D book yet: the Glossary uses the clay checklist.
  [BookOpen, "clipboard-list"],
]);

export function has3DIcon(icon: React.ElementType) {
  return SLUGS.has(icon);
}

export function Icon3D({
  icon: Icon,
  tone = "silver",
  className,
}: {
  icon: React.ElementType;
  /** silver: pearl clay (default) · teal: the active / accent version */
  tone?: "silver" | "teal";
  className?: string;
}) {
  const slug = SLUGS.get(Icon);
  if (!slug) return <Icon className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/icons3d/${tone}/${slug}.png`} alt="" aria-hidden="true" draggable={false} className={cn("icon-3d", className)} />
  );
}
