"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Account, Contact } from "@/lib/types";
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
  name: z.string().min(2, "Name must be at least 2 characters."),
  account_id: z.string().uuid("Please select an account."),
  primary_contact_id: z.string().optional(),
  service_line: z.string().optional(),
  stage: z.enum(PIPELINE_STAGES),
  probability_pct: z.string().transform((v) => parseInt(v, 10)),
  estimated_value: z.string().transform((v) => (v === "" ? 0 : parseFloat(v))),
  expected_start: z.string().optional(),
  expected_end: z.string().optional(),
  funding_source: z.string().optional(),
  next_step: z.string().optional(),
  next_step_due: z.string().optional(),
  notes: z.string().optional(),
});

function OpportunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account_id");
  
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [contacts, setContacts] = useState<Pick<Contact, "id" | "full_name">[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      account_id: preselectedAccountId || "",
      primary_contact_id: "",
      service_line: "",
      stage: "Lead",
      probability_pct: "10",
      estimated_value: "",
      expected_start: "",
      expected_end: "",
      funding_source: "",
      next_step: "",
      next_step_due: "",
      notes: "",
    },
  });

  const selectedAccountId = form.watch("account_id");

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase.from("accounts").select("id, name").order("name");
      setAccounts(data || []);
      setLoading(false);
    }
    fetchAccounts();
  }, []);

  useEffect(() => {
    async function fetchContacts() {
      if (!selectedAccountId) {
        setContacts([]);
        return;
      }
      const { data } = await supabase.from("contacts").select("id, full_name").eq("account_id", selectedAccountId);
      setContacts(data || []);
    }
    fetchContacts();
  }, [selectedAccountId]);

  async function onSubmit(values: any) {
    const payload = {
      ...values,
      primary_contact_id: values.primary_contact_id || null,
      expected_start: values.expected_start || null,
      expected_end: values.expected_end || null,
      next_step_due: values.next_step_due || null,
    };

    const { error } = await supabase.from("opportunities").insert([payload]);

    if (error) {
      console.error("Error creating opportunity:", error);
      return;
    }

    if (preselectedAccountId) {
      router.push(`/accounts/${preselectedAccountId}`);
    } else {
      router.push("/pipeline");
    }
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Opportunity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Opportunity Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Broadband Expansion Grant" {...field} />
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
                  name="primary_contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedAccountId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {contacts.map((contact: any) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.full_name}
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
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PIPELINE_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
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
                  name="probability_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select probability" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[0, 10, 25, 50, 75, 90, 100].map((pct) => (
                            <SelectItem key={pct} value={pct.toString()}>
                              {pct}%
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
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service_line"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Line</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cyber, Broadband" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="next_step"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Step</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Send draft proposal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_step_due"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Step Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about this opportunity..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Opportunity
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewOpportunityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OpportunityForm />
    </Suspense>
  );
}
