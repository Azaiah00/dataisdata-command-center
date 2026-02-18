"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Account, Contact, Engagement, Opportunity, Activity, Partner } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_COLORS } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Tag,
  User,
  Briefcase,
  GitBranch,
  CalendarDays,
  ShieldCheck,
  ChevronLeft,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccountData() {
      // Fetch Account
      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (accData) setAccount(accData);

      // Fetch Related Data
      const [contactsRes, engagementsRes, opportunitiesRes, activitiesRes] = await Promise.all([
        supabase.from("contacts").select("*").eq("account_id", id),
        supabase.from("engagements").select("*").eq("account_id", id),
        supabase.from("opportunities").select("*").eq("account_id", id),
        supabase.from("activities").select("*").eq("account_id", id).order("date_time", { ascending: false }),
      ]);

      setContacts(contactsRes.data || []);
      setEngagements(engagementsRes.data || []);
      setOpportunities(opportunitiesRes.data || []);
      setActivities(activitiesRes.data || []);
      
      setLoading(false);
    }

    fetchAccountData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!account) {
    return <div>Account not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{account.name}</h1>
            <Badge className={cn("font-medium border-none", STATUS_COLORS[account.status])}>
              {account.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {account.account_type}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {account.region_locality}, {account.region_state}
            </div>
            {account.primary_focus && (
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {account.primary_focus}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Account</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Actions</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({engagements.length})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-600">
                <p>{account.notes || "No notes available for this account."}</p>
                <div className="pt-4 border-t flex justify-between text-sm">
                  <div>
                    <span className="font-semibold block text-slate-900 uppercase text-[10px] mb-1">Owner</span>
                    {account.owner || "Unassigned"}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900 uppercase text-[10px] mb-1">Created</span>
                    {formatDate(account.created_at)}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900 uppercase text-[10px] mb-1">Last Updated</span>
                    {formatDate(account.updated_at)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Active Projects</span>
                  <span className="font-bold text-slate-900">{engagements.filter(e => e.status === 'In Progress').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Pipeline Value</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(opportunities.reduce((sum, op) => sum + (op.estimated_value || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Key Stakeholders</span>
                  <span className="font-bold text-slate-900">{contacts.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Stakeholders</h3>
            <Link href={`/contacts/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover:border-blue-200 transition-colors cursor-pointer" onClick={() => window.location.href = `/contacts/${contact.id}`}>
                <CardContent className="p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{contact.full_name}</h4>
                    <p className="text-xs text-slate-500">{contact.title_role}</p>
                    <div className="mt-3 space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
                No contacts associated with this account.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="engagements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Projects</h3>
            <Link href={`/engagements/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Engagement
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engagements.map((eng) => (
              <Card key={eng.id} className="hover:border-blue-200 transition-colors cursor-pointer" onClick={() => window.location.href = `/engagements/${eng.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{eng.name}</h4>
                      <p className="text-xs text-slate-500">{eng.engagement_type}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{eng.status}</Badge>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(eng.contract_value)}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(eng.start_date)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {engagements.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
                No active engagements for this account.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Pipeline Opportunities</h3>
            <Link href={`/pipeline/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Opportunity
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="hover:border-blue-200 transition-colors cursor-pointer" onClick={() => window.location.href = `/pipeline/${opp.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{opp.name}</h4>
                      <p className="text-xs text-slate-500">{opp.service_line}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{opp.stage}</Badge>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(opp.estimated_value)}</span>
                      <span className="text-[10px] text-slate-400">Weighted: {formatCurrency(opp.weighted_value)}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-slate-400 block">{opp.probability_pct}% Prob.</span>
                       <span className="text-[10px] text-slate-400">{formatDate(opp.expected_start)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {opportunities.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
                No opportunities in the pipeline.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Activity History</h3>
            <Link href={`/activities/new?account_id=${account.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Log Activity
              </Button>
            </Link>
          </div>
          <div className="bg-white border rounded-lg p-6">
            <ActivityFeed activities={activities} showAccount={false} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
