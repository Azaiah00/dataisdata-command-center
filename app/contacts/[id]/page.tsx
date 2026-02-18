"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Contact, Account, Activity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  CalendarDays,
  Tag,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contact, setContact] = useState<(Contact & { accounts: Account | null }) | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContactData() {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, accounts(*)")
        .eq("id", id)
        .single();

      if (data) setContact(data);

      const { data: actData } = await supabase
        .from("activities")
        .select("*")
        .contains("contact_ids", [id]) // This depends on how junction is handled, for now we'll skip or use activity_contacts
        .order("date_time", { ascending: false });
      
      // Since we used a junction table activity_contacts, we'd need a different join. 
      // For now, let's just fetch activities linked to the account.
      if (data?.account_id) {
         const { data: accountActs } = await supabase
           .from("activities")
           .select("*")
           .eq("account_id", data.account_id)
           .order("date_time", { ascending: false });
         setActivities(accountActs || []);
      }

      setLoading(false);
    }

    fetchContactData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contact) {
    return <div>Contact not found.</div>;
  }

  const healthColors: Record<string, string> = {
    Strong: "text-green-600 bg-green-50",
    Warm: "text-amber-600 bg-amber-50",
    Cold: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{contact.full_name}</h1>
            <Badge className={cn("font-medium border-none", healthColors[contact.relationship_health])}>
              {contact.relationship_health} Relationship
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">{contact.title_role} at {contact.accounts?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Contact</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Log Activity</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{contact.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{contact.phone || "No phone"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 className="w-4 h-4" />
                <Link href={`/accounts/${contact.account_id}`} className="text-sm text-blue-600 hover:underline">
                  {contact.accounts?.name}
                </Link>
              </div>
              <div className="pt-4 border-t">
                 <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">Influence</span>
                 <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          i < (contact.influence_level || 0) ? "bg-amber-500" : "bg-slate-200"
                        )}
                      />
                    ))}
                    <span className="text-xs text-slate-500 ml-2">{contact.influence_level}/5</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider">Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Next Step</span>
                <p className="text-sm text-slate-700 font-medium">{contact.next_step || "No next step defined."}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  )) || <span className="text-xs text-slate-400 italic">No tags</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">Recent Activity</CardTitle>
              <CalendarDays className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {activities.length > 0 ? (
                  activities.map((activity, idx) => (
                    <div key={activity.id} className="relative pl-6 pb-6 last:pb-0">
                      {idx !== activities.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100" />
                      )}
                      <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10">
                        <MessageSquare className="w-3 h-3 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-900">{activity.activity_type}</span>
                          <span className="text-xs text-slate-500">{formatDate(activity.date_time)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{activity.summary}</p>
                        {activity.next_action && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-xs border border-slate-100">
                            <span className="font-bold text-blue-600 mr-2">NEXT:</span>
                            {activity.next_action}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 italic border border-dashed rounded-lg">
                    No recent activities recorded.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
