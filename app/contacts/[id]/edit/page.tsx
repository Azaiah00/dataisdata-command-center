"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { RELATIONSHIP_HEALTHS } from "@/lib/constants";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  title_role: z.string().optional(),
  email: z.string().email("Invalid email address.").or(z.literal("")),
  phone: z.string().optional(),
  influence_level: z.string().min(1, "Select influence level"),
  relationship_health: z.enum(RELATIONSHIP_HEALTHS),
  next_step: z.string().optional(),
  existing_account_ids: z.array(z.string()),
});

export default function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      title_role: "",
      email: "",
      phone: "",
      influence_level: "3",
      relationship_health: "Cold",
      next_step: "",
      existing_account_ids: [],
    },
  });

  useEffect(() => {
    async function fetchData() {
      const [accRes, currentConRes, currentLinksRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("account_contacts").select("account_id").eq("contact_id", id),
      ]);

      if (currentConRes.error) {
        toast.error("Failed to load contact");
        router.push("/contacts");
        return;
      }

      setAccounts(accRes.data || []);
      
      const contact = currentConRes.data;
      form.reset({
        full_name: contact.full_name,
        title_role: contact.title_role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        influence_level: contact.influence_level?.toString() || "3",
        relationship_health: contact.relationship_health,
        next_step: contact.next_step || "",
        existing_account_ids: currentLinksRes.data?.map(l => l.account_id) || [],
      });
      
      setLoading(false);
    }
    fetchData();
  }, [id, form, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // 1. Update the contact
      const { error: conError } = await supabase
        .from("contacts")
        .update({
          full_name: values.full_name,
          title_role: values.title_role,
          email: values.email,
          phone: values.phone,
          influence_level: parseInt(values.influence_level, 10),
          relationship_health: values.relationship_health,
          next_step: values.next_step,
          // We update account_id to the first selected account for backward compatibility
          account_id: values.existing_account_ids[0] || null,
        })
        .eq("id", id);

      if (conError) throw conError;

      // 2. Update account links
      const { error: deleteError } = await supabase
        .from("account_contacts")
        .delete()
        .eq("contact_id", id);
      
      if (deleteError) throw deleteError;

      if (values.existing_account_ids.length > 0) {
        const links = values.existing_account_ids.map(accountId => ({
          account_id: accountId,
          contact_id: id,
        }));
        const { error: linkError } = await supabase.from("account_contacts").insert(links);
        if (linkError) throw linkError;
      }

      toast.success("Contact updated successfully");
      router.push("/contacts");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error(error.message || "Failed to update contact");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading contact details...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Contact</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  name="relationship_health"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship Health</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Associations</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Manage which accounts this contact is associated with.</p>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="existing_account_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Accounts</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map(accountId => {
                        const account = accounts.find(a => a.id === accountId);
                        return (
                          <Badge key={accountId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                            {account?.name}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 hover:bg-transparent"
                              onClick={() => field.onChange(field.value.filter(i => i !== accountId))}
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
                          <SelectValue placeholder="Select accounts to link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.filter(a => !field.value.includes(a.id)).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>A contact can be linked to multiple accounts.</FormDescription>
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
