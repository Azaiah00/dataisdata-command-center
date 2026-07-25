"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { RELATIONSHIP_HEALTHS, ACCOUNT_TYPES } from "@/lib/constants";
import { Account } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { ChevronLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  title_role: z.string().optional(),
  account_id: z.string().optional(),
  // New account fields
  new_account_name: z.string().optional(),
  new_account_type: z.enum(ACCOUNT_TYPES).optional(),
  email: z.string().email("Invalid email address.").or(z.literal("")),
  phone: z.string().optional(),
  influence_level: z.string().min(1, "Select influence level"),
  relationship_health: z.enum(RELATIONSHIP_HEALTHS),
  next_step: z.string().optional(),
}).refine((data) => data.account_id || data.new_account_name, {
  message: "Please select an existing account or provide a name for a new one.",
  path: ["account_id"],
});

function ContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account_id");
  
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      title_role: "",
      account_id: preselectedAccountId || "",
      new_account_name: "",
      new_account_type: "City",
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
    setIsSubmitting(true);
    try {
      let accountId = values.account_id;

      // 1. Create account if needed
      if (isCreatingAccount && values.new_account_name) {
        const { data: newAcc, error: accError } = await supabase
          .from("accounts")
          .insert([{ 
            name: values.new_account_name, 
            account_type: values.new_account_type,
            status: 'Active'
          }])
          .select()
          .single();

        if (accError) throw accError;
        accountId = newAcc.id;
      }

      // 2. Create contact
      const contactPayload = {
        full_name: values.full_name,
        title_role: values.title_role,
        account_id: accountId, // Keep for legacy/backward compatibility
        email: values.email,
        phone: values.phone,
        influence_level: values.influence_level ? parseInt(values.influence_level, 10) : null,
        relationship_health: values.relationship_health,
        next_step: values.next_step,
      };

      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert([contactPayload])
        .select()
        .single();

      if (contactError) throw contactError;

      // 3. Create link in account_contacts
      if (accountId) {
        const { error: linkError } = await supabase
          .from("account_contacts")
          .insert([{ account_id: accountId, contact_id: newContact.id }]);
        
        if (linkError) {
          console.warn("Failed to create account_contacts link, but contact was created:", linkError);
        }
      }

      toast.success("Contact created successfully");
      
      if (preselectedAccountId || accountId) {
        router.push(`/accounts/${preselectedAccountId || accountId}`);
      } else {
        router.push("/contacts");
      }
      router.refresh();
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error(error.message || "Failed to create contact");
    } finally {
      setIsSubmitting(false);
    }
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

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Account Association</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-700 h-8 px-2"
                      onClick={() => {
                        setIsCreatingAccount(!isCreatingAccount);
                        if (!isCreatingAccount) {
                          form.setValue("account_id", "");
                        } else {
                          form.setValue("new_account_name", "");
                        }
                      }}
                    >
                      {isCreatingAccount ? (
                        <><Search className="w-3.5 h-3.5 mr-1.5" /> Select Existing</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5 mr-1.5" /> Create New Account</>
                      )}
                    </Button>
                  </div>

                  {!isCreatingAccount ? (
                    <FormField
                      control={form.control}
                      name="account_id"
                      render={({ field }) => (
                        <FormItem>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
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
                          <FormDescription>Select the primary account for this contact.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50/50">
                      <FormField
                        control={form.control}
                        name="new_account_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-slate-500">New Account Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. City of Richmond" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="new_account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-slate-500">Account Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ACCOUNT_TYPES.map((type) => (
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
                    </div>
                  )}
                </div>

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
                <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Contact"}
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
