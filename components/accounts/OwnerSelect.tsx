"use client";

import { useAccess } from "@/components/auth/AccessProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Account Owner dropdown, used on New Account and Edit Account.
 *
 * - Lists the DataIsData team (portal seats). Guests / partners are left out,
 *   because they are outside people and should not own an account.
 * - The owner is saved as the person's name (accounts.owner is a text column),
 *   so the Accounts list and the account page show the new owner right away.
 * - A name that is no longer on the team (e.g. an old owner) still shows as "(current)",
 *   so opening Edit never silently changes who owns the account.
 */

// Radix Select can't use "" as a value, so "Unassigned" uses this placeholder.
export const UNASSIGNED = "__unassigned";

/** Turn the dropdown value into what gets saved (null = no owner). */
export function ownerToSave(value: string | undefined | null): string | null {
  return value && value !== UNASSIGNED ? value : null;
}

export function OwnerSelect({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const { users } = useAccess();

  // Team members who can own an account: not guests, not suspended. Sorted A–Z.
  // Set removes duplicate names so each shows once.
  const names = Array.from(
    new Set(users.filter((u) => u.seat_role !== "guest" && u.status !== "suspended").map((u) => u.full_name).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const current = value || UNASSIGNED;
  const isLegacy = current !== UNASSIGNED && !names.includes(current);

  return (
    <Select onValueChange={onChange} value={current}>
      <SelectTrigger>
        <SelectValue placeholder="Select owner" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {isLegacy && <SelectItem value={current}>{current} (current)</SelectItem>}
        {names.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
