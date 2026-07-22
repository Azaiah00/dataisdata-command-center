"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Account, Contact, Engagement, Opportunity, Activity, Contractor, Partner } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Tag,
  User,
  Briefcase,
  GitBranch,
  CalendarDays,
  ChevronLeft,
  Mail,
  Phone,
  Plus,
  ArrowUpRight,
  Clock,
  LayoutDashboard,
  HardHat,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [parentAccount, setParentAccount] = useState<Account | null>(null);
  const [childAccounts, setChildAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contractors, setContractors] = useState<(Contractor & { engagement_name?: string })[]>([]);
  const [partners, setPartners] = useState<(Partner & { engagement_name?: string })[]>([]);
  const [engContractorMap, setEngContractorMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccountData() {
      // Fetch Account
      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (accData) {
        setAccount(accData);
        
        // Fetch Parent Account if exists
        if (accData.parent_account_id) {
          const { data: parentData } = await supabase
            .from("accounts")
            .select("*")
            .eq("id", accData.parent_account_id)
            .single();
          setParentAccount(parentData);
        }

        // Fetch Child Accounts
        const { data: childrenData } = await supabase
          .from("accounts")
          .select("*")
          .eq("parent_account_id", id);
        setChildAccounts(childrenData || []);
      }

      // Fetch Related Data (opportunities: primary account + linked via related_account_ids)
      const [linksRes, engagementsRes, opportunitiesPrimaryRes, opportunitiesLinkedRes, activitiesRes] = await Promise.all([
        supabase.from("account_contacts").select("contacts(*)").eq("account_id", id),
        supabase.from("engagements").select("*").eq("account_id", id),
        supabase.from("opportunities").select("*").eq("account_id", id),
        supabase.from("opportunities").select("*").contains("related_account_ids", [id]),
        supabase.from("activities").select("*, accounts(name)").eq("account_id", id).order("date_time", { ascending: false }),
      ]);

      // Map contacts from junction table
      const mappedContacts = (linksRes.data || [])
        .map((link: any) => link.contacts)
        .filter(Boolean) as Contact[];
      
      setContacts(mappedContacts);
      const engs = engagementsRes.data || [];
      setEngagements(engs);
      // Merge primary + linked opportunities and dedupe by id (linked only if related_account_ids column exists)
      const primary = (opportunitiesPrimaryRes.data || []) as Opportunity[];
      const linked = opportunitiesLinkedRes.error ? [] : (opportunitiesLinkedRes.data || []) as Opportunity[];
      const seenIds = new Set<string>();
      const merged: Opportunity[] = [];
      [...primary, ...linked].forEach((op) => {
        if (!seenIds.has(op.id)) {
          seenIds.add(op.id);
          merged.push(op);
        }
      });
      setOpportunities(merged);
      setActivities(activitiesRes.data || []);

      // Fetch contractors linked to this account's engagements
      if (engs.length > 0) {
        const engIds = engs.map((e: any) => e.id);
        const { data: ecLinks } = await supabase
          .from("engagement_contractors")
          .select("engagement_id, contractors(*)")
          .in("engagement_id", engIds);

        // Build engagement -> contractor names map and deduplicated contractor list
        const cMap: Record<string, string[]> = {};
        const seen = new Map<string, Contractor & { engagement_name?: string }>();
        const engNameMap: Record<string, string> = {};
        engs.forEach((e: any) => { engNameMap[e.id] = e.name; });

        (ecLinks || []).forEach((link: any) => {
          if (!link.contractors) return;
          const c = link.contractors as Contractor;
          if (!cMap[link.engagement_id]) cMap[link.engagement_id] = [];
          cMap[link.engagement_id].push(c.full_name);
          if (!seen.has(c.id)) {
            seen.set(c.id, { ...c, engagement_name: engNameMap[link.engagement_id] });
          }
        });
        setEngContractorMap(cMap);
        setContractors(Array.from(seen.values()));

        // Fetch partners linked to this account's engagements
        const { data: epLinks } = await supabase
          .from("engagement_partners")
          .select("engagement_id, partners(*)")
          .in("engagement_id", engIds);

        const pSeen = new Map<string, Partner & { engagement_name?: string }>();
        (epLinks || []).forEach((link: any) => {
          if (!link.partners) return;
          const p = link.partners as Partner;
          if (!pSeen.has(p.id)) {
            pSeen.set(p.id, { ...p, engagement_name: engNameMap[link.engagement_id] });
          }
        });
        setPartners(Array.from(pSeen.values()));
      }

      setLoading(false);
    }

    fetchAccountData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-neutral-900">Account not found</h2>
        <Link href="/accounts" className="text-neutral-900 hover:underline mt-4 inline-block">
          Return to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#737373] uppercase tracking-wider">
        <Link href="/accounts" className="hover:text-neutral-900 transition-colors">Accounts</Link>
        <span>/</span>
        <span className="text-[#0a0a0a]">{account.name}</span>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0a0a0a]">{account.name}</h1>
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(account.status))}>
                  {account.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[#737373] text-sm">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {account.account_type}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {account.region_locality}, {account.region_state}
                </div>
                {account.primary_focus && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4" />
                    {account.primary_focus}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/accounts/${id}/edit`}>
              <Button variant="outline" className="border-neutral-200 text-neutral-700 bg-white">
                Edit Account
              </Button>
            </Link>
            <Link href={`/activities/new?account_id=${id}`}>
              <Button className="bg-neutral-900 hover:bg-neutral-800 text-white">
                Add Interaction
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="border-b border-neutral-200">
          <TabsList className="bg-transparent h-12 p-0 gap-8 border-none">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="engagements" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Engagements ({engagements.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pipeline" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Pipeline ({opportunities.length})
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Stakeholders ({contacts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="contractors" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Contractors ({contractors.length})
            </TabsTrigger>
            <TabsTrigger 
              value="partners" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Partners ({partners.length})
            </TabsTrigger>
            <TabsTrigger 
              value="activities" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#737373] data-[state=active]:text-neutral-900 px-0 h-12 text-sm font-semibold"
            >
              Activity History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0a0a0a]">About this Account</CardTitle>
                <CardDescription>Key details and background information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-[#525252] leading-relaxed">
                  {account.notes || "No additional notes available for this account."}
                </div>
                
                {(parentAccount || childAccounts.length > 0) && (
                  <div className="pt-6 border-t border-neutral-200 space-y-4">
                    {parentAccount && (
                      <div>
                        <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest block mb-1">Parent Account</span>
                        <Link href={`/accounts/${parentAccount.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                          {parentAccount.name}
                        </Link>
                      </div>
                    )}
                    {childAccounts.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest block mb-1">Child Accounts</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {childAccounts.map(child => (
                            <Link key={child.id} href={`/accounts/${child.id}`}>
                              <Badge variant="outline" className="text-neutral-900 border-neutral-200 bg-neutral-100/50 hover:bg-neutral-100">
                                {child.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-neutral-200 flex flex-wrap gap-x-12 gap-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest block mb-1">Owner</span>
                    <span className="text-sm font-semibold text-[#0a0a0a]">{account.owner || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest block mb-1">Created</span>
                    <span className="text-sm font-semibold text-[#0a0a0a]">{formatDate(account.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest block mb-1">Last Updated</span>
                    <span className="text-sm font-semibold text-[#0a0a0a]">{formatDate(account.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0a0a0a]">Quick Stats</CardTitle>
                <CardDescription>Performance metrics for this account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                  <span className="text-sm text-[#737373]">Active Projects</span>
                  <span className="font-bold text-[#0a0a0a]">{engagements.filter(e => e.status === 'In Progress').length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                  <span className="text-sm text-[#737373]">Pipeline Value</span>
                  <span className="font-bold text-neutral-900">
                    {formatCurrency(opportunities.reduce((sum, op) => sum + (op.estimated_value || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                  <span className="text-sm text-[#737373]">Stakeholders</span>
                  <span className="font-bold text-[#0a0a0a]">{contacts.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                  <span className="text-sm text-[#737373]">Contractors</span>
                  <span className="font-bold text-neutral-600">{contractors.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-[#737373]">Last Interaction</span>
                  <span className="font-bold text-[#0a0a0a]">{activities.length > 0 ? formatDate(activities[0].date_time) : "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Stakeholders</h3>
            <Link href={`/contacts/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card 
                key={contact.id} 
                className="hover:shadow-md transition-all cursor-pointer border-neutral-200 group" 
                onClick={() => window.location.href = `/contacts/${contact.id}`}
              >
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold text-sm">
                    {contact.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0a0a0a] group-hover:text-neutral-900 transition-colors truncate">{contact.full_name}</h4>
                    <p className="text-xs text-[#737373] truncate">{contact.title_role}</p>
                    <div className="mt-4 space-y-2">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-[#737373]">
                          <Mail className="w-3.5 h-3.5" /> <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                         <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  i < (contact.influence_level || 0) ? "bg-neutral-900" : "bg-neutral-200"
                                )}
                              />
                            ))}
                         </div>
                         <Badge className={cn("text-[9px] h-4 px-1 border-none ml-auto", getStatusColor(contact.relationship_health))}>
                           {contact.relationship_health}
                         </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-[#737373] text-sm font-medium">No stakeholders found</p>
                <Link href={`/contacts/new?account_id=${account.id}`} className="text-neutral-900 text-xs font-bold hover:underline mt-2 inline-block">
                  Add your first contact
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="engagements" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Active Engagements</h3>
            <Link href={`/engagements/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Engagement
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engagements.map((eng) => (
              <Card 
                key={eng.id} 
                className="hover:shadow-md transition-all cursor-pointer border-neutral-200 group" 
                onClick={() => window.location.href = `/engagements/${eng.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-neutral-900" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0a0a0a] group-hover:text-neutral-900 transition-colors leading-tight">
                          {eng.name}
                        </h4>
                        <p className="text-xs text-[#737373]">{eng.engagement_type}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] h-5 px-2 border-none font-medium", getStatusColor(eng.status))}>
                      {eng.status}
                    </Badge>
                  </div>
                  {/* Assigned contractors */}
                  {engContractorMap[eng.id] && engContractorMap[eng.id].length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {engContractorMap[eng.id].map((name) => (
                        <Badge key={name} variant="secondary" className="text-[9px] h-4 px-1.5 bg-neutral-100 text-neutral-700 border-none">
                          <HardHat className="w-2.5 h-2.5 mr-0.5" />
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#737373]">Value</span>
                      <span className="text-sm font-bold text-[#0a0a0a]">{formatCurrency(eng.contract_value)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#737373]">Timeline</span>
                      <span className="text-sm font-bold text-[#0a0a0a] block">
                        {eng.start_date ? new Date(eng.start_date).toLocaleDateString() : "TBD"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {engagements.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-[#737373] text-sm font-medium">No active engagements</p>
                <Link href={`/engagements/new?account_id=${account.id}`} className="text-neutral-900 text-xs font-bold hover:underline mt-2 inline-block">
                  Create an engagement
                </Link>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="pipeline" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Pipeline Opportunities</h3>
            <Link href={`/pipeline/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Opportunity
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <Card 
                key={opp.id} 
                className="hover:shadow-md transition-all cursor-pointer border-neutral-200 group" 
                onClick={() => window.location.href = `/pipeline/${opp.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-neutral-900" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0a0a0a] group-hover:text-neutral-900 transition-colors leading-tight">
                          {opp.name}
                        </h4>
                        <p className="text-xs text-[#737373]">{opp.service_line}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] h-5 px-2 border-none font-medium", getStatusColor(opp.stage))}>
                      {opp.stage}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div>
                      <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block mb-1">Value</span>
                      <span className="text-sm font-bold text-[#0a0a0a]">{formatCurrency(opp.estimated_value)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block mb-1">Weighted</span>
                      <span className="text-sm font-bold text-neutral-900">{formatCurrency(opp.weighted_value)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block mb-1">Probability</span>
                      <span className="text-sm font-bold text-[#0a0a0a]">{opp.probability_pct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block mb-1">Expected Start</span>
                      <span className="text-sm font-bold text-[#0a0a0a]">{opp.expected_start ? formatDate(opp.expected_start) : "TBD"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {opportunities.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-[#737373] text-sm font-medium">No opportunities in pipeline</p>
                <Link href={`/pipeline/new?account_id=${account.id}`} className="text-neutral-900 text-xs font-bold hover:underline mt-2 inline-block">
                  Add an opportunity
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Contractors Tab */}
        <TabsContent value="contractors" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Contractors</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractors.map((c) => (
              <Card
                key={c.id}
                className="hover:shadow-md transition-all cursor-pointer border-neutral-200 group"
                onClick={() => window.location.href = `/contractors/${c.id}`}
              >
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0a0a0a] group-hover:text-neutral-900 transition-colors truncate">
                      {c.full_name}
                    </h4>
                    <p className="text-xs text-[#737373] truncate">{c.title_role || "Contractor"}</p>
                    {c.engagement_name && (
                      <p className="text-[10px] text-[#a3a3a3] mt-1 truncate">
                        On: {c.engagement_name}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {c.email && (
                        <span className="text-[10px] text-[#737373] flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.email}
                        </span>
                      )}
                    </div>
                    <Badge className={cn("text-[9px] h-4 px-1 border-none mt-2", getStatusColor(c.status))}>
                      {c.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {contractors.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HardHat className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-[#737373] text-sm font-medium">No contractors linked to this account&apos;s engagements</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Partners</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p) => (
              <Card
                key={p.id}
                className="hover:shadow-md transition-all cursor-pointer border-neutral-200 group"
                onClick={() => window.location.href = `/partners/${p.id}`}
              >
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#0a0a0a] group-hover:text-neutral-900 transition-colors truncate">
                      {p.name}
                    </h4>
                    <p className="text-xs text-[#737373] truncate">{p.partner_type || "Partner"}</p>
                    {p.engagement_name && (
                      <p className="text-[10px] text-[#a3a3a3] mt-1 truncate">
                        On: {p.engagement_name}
                      </p>
                    )}
                    {p.capabilities && (
                      <p className="text-[10px] text-[#737373] mt-2 truncate">{p.capabilities}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {partners.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-[#737373] text-sm font-medium">No partners linked to this account&apos;s engagements</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a0a0a]">Interaction Timeline</h3>
            <Link href={`/activities/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Log Interaction
              </Button>
            </Link>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <ActivityFeed activities={activities} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
