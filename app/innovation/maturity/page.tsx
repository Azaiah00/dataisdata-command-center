"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { MATURITY_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

type AccountRow = { id: string; name: string };
type SnapshotRow = {
  id: string;
  account_id: string;
  as_of_date: string;
  overall_score: number | null;
  governance: number | null;
  cyber_resilience: number | null;
  broadband_readiness: number | null;
  data_maturity: number | null;
  ai_readiness: number | null;
  workforce_capacity: number | null;
  vendor_alignment: number | null;
  grant_capture: number | null;
};

const EMPTY_FORM: Record<(typeof MATURITY_CATEGORIES)[number], number> = {
  governance: 50,
  cyber_resilience: 50,
  broadband_readiness: 50,
  data_maturity: 50,
  ai_readiness: 50,
  workforce_capacity: 50,
  vendor_alignment: 50,
  grant_capture: 50,
};

export default function MaturityPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadAccounts() {
    const { data } = await supabase.from("accounts").select("id, name").order("name");
    setAccounts((data as AccountRow[]) || []);
    if (!selectedAccount && data?.[0]?.id) setSelectedAccount(data[0].id);
  }

  async function loadSnapshots(accountId: string) {
    if (!accountId) return;
    const { data, error } = await supabase
      .from("innovation_maturity_snapshots")
      .select("*")
      .eq("account_id", accountId)
      .order("as_of_date", { ascending: false });
    if (error) console.error("Error loading maturity snapshots:", error);
    setSnapshots((data as SnapshotRow[]) || []);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadSnapshots(selectedAccount);
  }, [selectedAccount]);

  const latest = snapshots[0];
  const chartData = useMemo(() => {
    const source = latest || (form as unknown as SnapshotRow);
    return MATURITY_CATEGORIES.map((key) => ({ name: key.replaceAll("_", " "), score: source[key] || 0 }));
  }, [latest, form]);

  const overallScore = useMemo(() => {
    const sum = chartData.reduce((acc, item) => acc + item.score, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  async function saveSnapshot() {
    if (!selectedAccount) return;
    setSaving(true);
    const payload = {
      account_id: selectedAccount,
      as_of_date: new Date().toISOString().slice(0, 10),
      ...form,
      overall_score: Math.round(Object.values(form).reduce((a, b) => a + b, 0) / MATURITY_CATEGORIES.length),
    };
    const { error } = await supabase.from("innovation_maturity_snapshots").insert([payload]);
    setSaving(false);
    if (error) {
      toast.error("Could not save maturity snapshot");
      return;
    }
    toast.success("Maturity snapshot recorded");
    loadSnapshots(selectedAccount);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Innovation Maturity Index</h1>
        <p className="text-[#6B7280]">Track baseline, improvement, and score history by account.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <Label className="text-xs text-[#6B7280]">Account</Label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#111827]">Maturity Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickCount={6}
                  />
                  <Radar
                    name="Maturity Score"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="var(--primary)"
                    fillOpacity={0.15}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted text-white">
          <CardHeader>
            <CardTitle className="text-white/80 text-sm font-medium uppercase tracking-wider">Overall Maturity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4 pb-8">
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-white/20"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * (latest?.overall_score ?? overallScore)) / 100}
                  strokeLinecap="round"
                  className="text-white transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tracking-tight">
                  {latest?.overall_score ?? overallScore}
                </span>
                <span className="text-white/80 text-xs font-medium mt-1">INDEX SCORE</span>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 w-full px-4">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-tight">Status</p>
                <p className="text-sm font-semibold mt-0.5">
                  {(latest?.overall_score ?? overallScore) > 75 ? 'Advanced' : (latest?.overall_score ?? overallScore) > 40 ? 'Developing' : 'Initial'}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-tight">Target</p>
                <p className="text-sm font-semibold mt-0.5">90+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Record New Snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MATURITY_CATEGORIES.map((category) => (
              <div key={category}>
                <Label className="text-xs text-[#6B7280] capitalize">{category.replaceAll("_", " ")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form[category]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [category]: Number(e.target.value || 0) }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={saveSnapshot} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? "Saving..." : "Record New Snapshot"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Snapshot History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {snapshots.length === 0 && <p className="text-sm text-[#6B7280]">No snapshots recorded yet.</p>}
          {snapshots.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm">
              <span>{new Date(item.as_of_date).toLocaleDateString()}</span>
              <span className="font-semibold">{item.overall_score ?? 0}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
