"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { RELATIONSHIP_HEALTHS } from "@/lib/constants";
import { Account } from "@/lib/types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  title_role: z.string().optional(),
  account_id: z.string().uuid("Please select an account."),
  email: z.string().email("Invalid email address.").or(z.literal("")),
  phone: z.string().optional(),
  influence_level: z.string().min(1, "Select influence level"),
  relationship_health: z.enum(RELATIONSHIP_HEALTHS),
  next_step: z.string().optional(),
});

function ContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account_id");
  
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      title_role: "",
      account_id: preselectedAccountId || "",
      email: "",
      phone: "",
      influence_level: "3",
      relationship_health: "Cold",
      next_step: "",
    },
  });

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase.from("accounts").select("id, name").order("name");
      setAccounts(data || []);
      setLoadingAccounts(false);
    }
    fetchAccounts();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      influence_level: values.influence_level ? parseInt(values.influence_level, 10) : null,
    };
    const { error } = await supabase.from("contacts").insert([payload]);

    if (error) {
      console.error("Error creating contact:", error);
      return;
    }

    if (preselectedAccountId) {
      router.push(`/accounts/${preselectedAccountId}`);
    } else {
      router.push("/contacts");
    }
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Contact</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title / Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CIO, City Manager" {...field} />
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
                        disabled={loadingAccounts}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Select account"} />
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
                  name="relationship_health"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship Health</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select health" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELATIONSHIP_HEALTHS.map((health) => (
                            <SelectItem key={health} value={health}>
                              {health}
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.gov" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="influence_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Influence Level (1-5)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <SelectItem key={lvl} value={lvl.toString()}>
                              {lvl} {lvl === 5 ? "(Critical)" : lvl === 1 ? "(Low)" : ""}
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
                name="next_step"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Step</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Schedule follow-up meeting" {...field} />
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
                  Create Contact
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewContactPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContactForm />
    </Suspense>
  );
}
