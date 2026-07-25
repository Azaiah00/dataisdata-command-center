"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_TYPES, ACCOUNT_STATUSES } from "@/lib/constants";
import { Account, Contact } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  account_type: z.enum(ACCOUNT_TYPES),
  region_state: z.string().min(2, "State is required."),
  region_locality: z.string().min(2, "Locality is required."),
  primary_focus: z.string().optional(),
  status: z.enum(ACCOUNT_STATUSES),
  owner: z.string().optional(),
  notes: z.string().optional(),
  parent_account_id: z.string().optional(),
  existing_contact_ids: z.array(z.string()),
});

export default function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [contacts, setContacts] = useState<Pick<Contact, "id" | "full_name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      account_type: "City",
      region_state: "",
      region_locality: "",
      primary_focus: "",
      status: "Prospect",
      owner: "Tony Wood",
      notes: "",
      parent_account_id: "",
      existing_contact_ids: [],
    },
  });

  useEffect(() => {
    async function fetchData() {
      const [accRes, conRes, currentAccRes, currentLinksRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("contacts").select("id, full_name").order("full_name"),
        supabase.from("accounts").select("*").eq("id", id).single(),
        supabase.from("account_contacts").select("contact_id").eq("account_id", id),
      ]);

      if (currentAccRes.error) {
        toast.error("Failed to load account");
        router.push("/accounts");
        return;
      }

      setAccounts(accRes.data || []);
      setContacts(conRes.data || []);
      
      const account = currentAccRes.data;
      form.reset({
        name: account.name,
        account_type: account.account_type,
        region_state: account.region_state || "",
        region_locality: account.region_locality || "",
        primary_focus: account.primary_focus || "",
        status: account.status,
        owner: account.owner || "",
        notes: account.notes || "",
        parent_account_id: account.parent_account_id || "none",
        existing_contact_ids: currentLinksRes.data?.map(l => l.contact_id) || [],
      });
      
      setLoading(false);
    }
    fetchData();
  }, [id, form, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Basic cycle guard: check if the selected parent is one of the account's children
      if (values.parent_account_id && values.parent_account_id !== "none") {
        const { data: children } = await supabase
          .from("accounts")
          .select("id")
          .eq("parent_account_id", id);
        
        if (children?.some(c => c.id === values.parent_account_id)) {
          throw new Error("Cannot set a child account as a parent (this would create a cycle).");
        }
      }

      // 1. Update the account
      const { error: accError } = await supabase
        .from("accounts")
        .update({
          name: values.name,
          account_type: values.account_type,
          region_state: values.region_state,
          region_locality: values.region_locality,
          primary_focus: values.primary_focus,
          status: values.status,
          owner: values.owner,
          notes: values.notes,
          parent_account_id: values.parent_account_id === "none" ? null : (values.parent_account_id || null),
        })
        .eq("id", id);

      if (accError) throw accError;

      // 2. Update contact links (delete all and re-insert for simplicity in this MVP)
      // In a production app, you'd diff them to avoid unnecessary churn.
      const { error: deleteError } = await supabase
        .from("account_contacts")
        .delete()
        .eq("account_id", id);
      
      if (deleteError) throw deleteError;

      if (values.existing_contact_ids.length > 0) {
        const links = values.existing_contact_ids.map(contactId => ({
          account_id: id,
          contact_id: contactId,
        }));
        const { error: linkError } = await supabase.from("account_contacts").insert(links);
        if (linkError) throw linkError;
      }

      toast.success("Account updated successfully");
      router.push(`/accounts/${id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating account:", error);
      toast.error(error.message || "Failed to update account");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading account details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Account</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Richmond City IT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={form.control}
                  name="parent_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {accounts.filter(acc => acc.id !== id).map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Link this to a larger organization or agency.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACCOUNT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
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
                  name="region_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Region</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. VA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region_locality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locality / City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Richmond" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="primary_focus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Focus</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Broadband, Cyber, Innovation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional context about this account..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stakeholders</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Manage linked contacts for this account.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="existing_contact_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Contacts</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map(contactId => {
                        const contact = contacts.find(c => c.id === contactId);
                        return (
                          <Badge key={contactId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                            {contact?.full_name}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 hover:bg-transparent"
                              onClick={() => field.onChange(field.value.filter(i => i !== contactId))}
                            >
                              <Trash2 className="h-3 w-3 text-slate-400" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select onValueChange={(val) => {
                      if (!field.value.includes(val)) {
                        field.onChange([...field.value, val]);
                      }
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contacts to link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.filter(c => !field.value.includes(c.id)).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
