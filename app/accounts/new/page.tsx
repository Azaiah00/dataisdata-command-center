"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_TYPES, ACCOUNT_STATUSES, RELATIONSHIP_HEALTHS } from "@/lib/constants";
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
import { ChevronLeft, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const contactSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  title_role: z.string().optional(),
  email: z.string().email("Invalid email address.").or(z.literal("")),
  relationship_health: z.enum(RELATIONSHIP_HEALTHS),
});

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
  inline_contacts: z.array(contactSchema),
});

export default function NewAccountPage() {
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
      inline_contacts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "inline_contacts",
  });

  useEffect(() => {
    async function fetchData() {
      const [accRes, conRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("contacts").select("id, full_name").order("full_name"),
      ]);
      setAccounts(accRes.data || []);
      setContacts(conRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // 1. Create the account
      const { data: newAccount, error: accError } = await supabase
        .from("accounts")
        .insert([{
          name: values.name,
          account_type: values.account_type,
          region_state: values.region_state,
          region_locality: values.region_locality,
          primary_focus: values.primary_focus,
          status: values.status,
          owner: values.owner,
          notes: values.notes,
          parent_account_id: values.parent_account_id || null,
        }])
        .select()
        .single();

      if (accError) throw accError;

      const accountId = newAccount.id;

      // 2. Link existing contacts
      if (values.existing_contact_ids.length > 0) {
        const links = values.existing_contact_ids.map(contactId => ({
          account_id: accountId,
          contact_id: contactId,
        }));
        const { error: linkError } = await supabase.from("account_contacts").insert(links);
        if (linkError) throw linkError;
      }

      // 3. Create and link inline contacts
      if (values.inline_contacts.length > 0) {
        const newContacts = values.inline_contacts.map(c => ({
          ...c,
          account_id: accountId, // Legacy link
        }));
        
        const { data: createdContacts, error: conError } = await supabase
          .from("contacts")
          .insert(newContacts)
          .select();

        if (conError) throw conError;

        if (createdContacts && createdContacts.length > 0) {
          const inlineLinks = createdContacts.map(c => ({
            account_id: accountId,
            contact_id: c.id,
          }));
          const { error: inlineLinkError } = await supabase.from("account_contacts").insert(inlineLinks);
          if (inlineLinkError) throw inlineLinkError;
        }
      }

      toast.success("Account created successfully");
      router.push(`/accounts/${accountId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Account</h1>
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
                          {accounts.map((acc) => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <p className="text-sm text-neutral-500 mt-1">Link existing contacts or create new ones for this account.</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => append({ full_name: "", title_role: "", email: "", relationship_health: "Cold" })}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add New Contact
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="existing_contact_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Existing Contacts</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map(id => {
                        const contact = contacts.find(c => c.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                            {contact?.full_name}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 hover:bg-transparent"
                              onClick={() => field.onChange(field.value.filter(i => i !== id))}
                            >
                              <Trash2 className="h-3 w-3 text-neutral-400" />
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

              {fields.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold">New Contacts to Create</h4>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-neutral-50 relative group">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                      
                      <FormField
                        control={form.control}
                        name={`inline_contacts.${index}.full_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-neutral-500">Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Name" {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`inline_contacts.${index}.title_role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-neutral-500">Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Title" {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`inline_contacts.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-neutral-500">Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Email" {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`inline_contacts.${index}.relationship_health`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-neutral-500">Health</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Health" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {RELATIONSHIP_HEALTHS.map((h) => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-neutral-900 hover:bg-neutral-800" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
