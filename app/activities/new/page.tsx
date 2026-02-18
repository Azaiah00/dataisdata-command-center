"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { ACTIVITY_TYPES, OUTCOME_TYPES } from "@/lib/constants";
import { Account, Engagement, Opportunity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

const formSchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  date_time: z.string().min(1, "Date and time are required."),
  account_id: z.string().uuid("Please select an account."),
  engagement_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  summary: z.string().min(5, "Summary must be at least 5 characters."),
  outcome: z.enum(OUTCOME_TYPES),
  next_action: z.string().optional(),
  next_action_due: z.string().optional(),
});

function ActivityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account_id");
  const preselectedEngagementId = searchParams.get("engagement_id");
  const preselectedOpportunityId = searchParams.get("opportunity_id");
  
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [engagements, setEngagements] = useState<Pick<Engagement, "id" | "name">[]>([]);
  const [opportunities, setOpportunities] = useState<Pick<Opportunity, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_type: "Meeting",
      date_time: new Date().toISOString().slice(0, 16),
      account_id: preselectedAccountId || "",
      engagement_id: preselectedEngagementId || "",
      opportunity_id: preselectedOpportunityId || "",
      summary: "",
      outcome: "Neutral",
      next_action: "",
      next_action_due: "",
    },
  });

  const selectedAccountId = form.watch("account_id");

  useEffect(() => {
    async function fetchInitialData() {
      const { data: accData } = await supabase.from("accounts").select("id, name").order("name");
      setAccounts(accData || []);
      setLoading(false);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchContextualData() {
      if (!selectedAccountId) {
        setEngagements([]);
        setOpportunities([]);
        return;
      }

      const [engRes, oppRes] = await Promise.all([
        supabase.from("engagements").select("id, name").eq("account_id", selectedAccountId),
        supabase.from("opportunities").select("id, name").eq("account_id", selectedAccountId),
      ]);

      setEngagements(engRes.data || []);
      setOpportunities(oppRes.data || []);
    }
    fetchContextualData();
  }, [selectedAccountId]);

  async function onSubmit(values: any) {
    // Convert empty strings to null for UUID fields
    const payload = {
      ...values,
      engagement_id: values.engagement_id || null,
      opportunity_id: values.opportunity_id || null,
      next_action_due: values.next_action_due || null,
    };

    const { error } = await supabase.from("activities").insert([payload]);

    if (error) {
      console.error("Error logging activity:", error);
      return;
    }

    if (preselectedAccountId) {
      router.push(`/accounts/${preselectedAccountId}`);
    } else {
      router.push("/activities");
    }
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Log Activity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="activity_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading..." : "Select account"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OUTCOME_TYPES.map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>
                              {outcome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engagement_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Engagement (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedAccountId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select engagement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {engagements.map((eng) => (
                            <SelectItem key={eng.id} value={eng.id}>
                              {eng.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opportunity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Opportunity (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedAccountId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select opportunity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {opportunities.map((opp) => (
                            <SelectItem key={opp.id} value={opp.id}>
                              {opp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary / Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What happened during this activity?"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="next_action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Send proposal draft" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_action_due"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Log Activity
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewActivityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivityForm />
    </Suspense>
  );
}
