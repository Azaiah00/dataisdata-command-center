"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { PARTNER_TYPES } from "@/lib/constants";
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
import { FileAttachments } from "@/components/ui/FileAttachments";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  partner_type: z.enum(PARTNER_TYPES),
  capabilities: z.string().optional(),
  contract_vehicles: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()),
});

export default function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      partner_type: "Vendor",
      capabilities: "",
      contract_vehicles: "",
      notes: "",
      attachments: [],
    },
  });

  // Load existing partner data
  useEffect(() => {
    async function fetchPartner() {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Failed to load partner");
        router.push("/partners");
        return;
      }

      form.reset({
        name: data.name,
        partner_type: data.partner_type,
        capabilities: data.capabilities || "",
        contract_vehicles: data.contract_vehicles || "",
        notes: data.notes || "",
        attachments: data.attachments || [],
      });

      setLoading(false);
    }

    fetchPartner();
  }, [id, form, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({
          name: values.name,
          partner_type: values.partner_type,
          capabilities: values.capabilities || null,
          contract_vehicles: values.contract_vehicles || null,
          notes: values.notes || null,
          attachments: values.attachments.length ? values.attachments : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Partner updated successfully");
      router.push(`/partners/${id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update partner");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/partners/${id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Edit Partner</h1>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Partner Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AWS, Microsoft" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PARTNER_TYPES.map((type) => (
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
                  name="capabilities"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Capabilities / Expertise</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cloud Infrastructure, Cybersecurity, Staffing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contract_vehicles"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Contract Vehicles (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. GSA Schedule 70, Statewide Contract" {...field} />
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
                        placeholder="Additional context about this partner..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachments</FormLabel>
                    <FormControl>
                      <FileAttachments label="" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Link href={`/partners/${id}`}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
