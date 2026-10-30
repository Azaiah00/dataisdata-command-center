import { supabase } from "@/lib/supabase";
import { num } from "@/lib/utils";

export interface ContractorEngagement {
  id: string;
  name: string;
  status: string;
  engagement_type: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  account_id: string | null;
  account_name: string | null;
}

export interface ContractorRollup {
  engagements: ContractorEngagement[];
  totalValue: number;
  withValue: number;
  missingValue: number;
  activeCount: number;
  agencies: { id: string; name: string }[];
  lastEnd: string | null;
}

const ACTIVE = new Set(["In Progress", "Active", "Planned", "On Hold"]);

export function rollup(list: ContractorEngagement[]): ContractorRollup {
  const sorted = [...list].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
  const agencies = new Map<string, string>();
  sorted.forEach((e) => e.account_id && e.account_name && agencies.set(e.account_id, e.account_name));
  return {
    engagements: sorted,
    totalValue: sorted.reduce((t, e) => t + (e.contract_value == null ? 0 : num(e.contract_value)), 0),
    withValue: sorted.filter((e) => e.contract_value != null).length,
    missingValue: sorted.filter((e) => e.contract_value == null).length,
    activeCount: sorted.filter((e) => ACTIVE.has(e.status)).length,
    agencies: Array.from(agencies, ([id, name]) => ({ id, name })),
    lastEnd: sorted.reduce<string | null>((m, e) => (e.end_date && (!m || e.end_date > m) ? e.end_date : m), null),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toEngagement(e: any): ContractorEngagement | null {
  if (!e) return null;
  const acc = Array.isArray(e.accounts) ? e.accounts[0] : e.accounts;
  return {
    id: e.id,
    name: e.name,
    status: e.status,
    engagement_type: e.engagement_type ?? null,
    contract_value: e.contract_value == null ? null : num(e.contract_value),
    start_date: e.start_date ?? null,
    end_date: e.end_date ?? null,
    account_id: e.account_id ?? acc?.id ?? null,
    account_name: acc?.name ?? null,
  };
}

const ENG_SELECT = "id, name, status, engagement_type, contract_value, start_date, end_date, account_id, accounts(id, name)";

/** Every contractor's engagements, read from the same engagement records the Engagements pages edit. */
export async function loadContractorRollups(): Promise<Record<string, ContractorRollup>> {
  const { data, error } = await supabase.from("engagement_contractors").select(`contractor_id, engagements(${ENG_SELECT})`);
  if (error) {
    console.error("Error loading contractor engagements:", error.message);
    return {};
  }
  const by: Record<string, ContractorEngagement[]> = {};
  (data || []).forEach((row: any) => {
    const eng = toEngagement(Array.isArray(row.engagements) ? row.engagements[0] : row.engagements);
    if (!eng) return;
    (by[row.contractor_id] ||= []).push(eng);
  });
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, rollup(v)]));
}

export async function loadContractorRollup(contractorId: string): Promise<ContractorRollup> {
  const { data, error } = await supabase
    .from("engagement_contractors")
    .select(`engagements(${ENG_SELECT})`)
    .eq("contractor_id", contractorId);
  if (error) console.error("Error loading contractor engagements:", error.message);
  const list = (data || [])
    .map((row: any) => toEngagement(Array.isArray(row.engagements) ? row.engagements[0] : row.engagements))
    .filter(Boolean) as ContractorEngagement[];
  return rollup(list);
}

/** Contractor names per engagement, for engagement/account lists. */
export async function loadEngagementContractors(): Promise<Record<string, { id: string; full_name: string }[]>> {
  const { data, error } = await supabase.from("engagement_contractors").select("engagement_id, contractors(id, full_name)");
  if (error) return {};
  const by: Record<string, { id: string; full_name: string }[]> = {};
  (data || []).forEach((row: any) => {
    const c = Array.isArray(row.contractors) ? row.contractors[0] : row.contractors;
    if (c) (by[row.engagement_id] ||= []).push({ id: c.id, full_name: c.full_name });
  });
  return by;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
