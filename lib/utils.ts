import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatCompactCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDateRelative(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
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
  if (s === 'active' || s === 'awarded' || s === 'good' || s === 'complete' || s === 'on-track' || s === 'paid' || s === 'approved' || s === 'reimbursed') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'prospect' || s === 'proposal' || s === 'lead' || s === 'planned' || s === 'discovery' || s === 'draft' || s === 'pending') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'negotiation' || s === 'in progress' || s === 'warm' || s === 'sent') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (s === 'on hold' || s === 'neutral' || s === 'cancelled') return 'bg-gray-100 text-gray-700 border-gray-200';
  if (s === 'lost' || s === 'dormant' || s === 'bad' || s === 'at-risk' || s === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
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
