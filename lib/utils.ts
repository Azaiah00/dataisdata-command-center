import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseDate } from "@/lib/finance/dates"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True when a money value was actually entered (0 counts; blank/null does not). */
export function hasAmount(amount: number | string | null | undefined): boolean {
  if (amount === null || amount === undefined || amount === "") return false;
  const n = typeof amount === "string" ? Number(amount) : amount;
  return isFinite(n);
}

export function formatCurrency(amount: number | string | null | undefined) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || !isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/** Coerce Postgres NUMERIC values (sometimes returned as strings) into numbers. */
export function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && isFinite(n) ? n : 0;
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatCompactCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || !isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDateRelative(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  const date = parseDate(dateString);
  if (!date) return "N/A";
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getStatusColor(status: string) {
  const s = status?.toLowerCase();
  // Soft pills, matching the reference: green = done/good, slate-blue = early/planned,
  // violet = moving, amber = waiting, red = problem, grey = neutral.
  if (s === 'active' || s === 'awarded' || s === 'good' || s === 'complete' || s === 'on-track' || s === 'paid' || s === 'approved' || s === 'reimbursed') return 'bg-[#dcf2e4] text-[#23774a] border-transparent';
  if (s === 'prospect' || s === 'proposal' || s === 'lead' || s === 'planned' || s === 'discovery' || s === 'draft' || s === 'pending') return 'bg-[#e6ebf3] text-[#3d4e70] border-transparent';
  if (s === 'negotiation' || s === 'in progress' || s === 'warm' || s === 'sent') return 'bg-[#ebe6f7] text-[#5b4a91] border-transparent';
  if (s === 'on hold' || s === 'neutral' || s === 'cancelled') return 'bg-[#fbf0d9] text-[#8a5a12] border-transparent';
  if (s === 'lost' || s === 'dormant' || s === 'bad' || s === 'at-risk' || s === 'overdue' || s === 'suspended' || s === 'ended') return 'bg-[#fbe1df] text-[#b4372f] border-transparent';
  return 'bg-[#eceff4] text-[#59647a] border-transparent';
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  const d = parseDate(dateString);
  if (!d) return "N/A";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
