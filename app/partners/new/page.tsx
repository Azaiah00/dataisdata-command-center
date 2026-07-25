"use client";

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
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  partner_type: z.enum(PARTNER_TYPES),
  capabilities: z.string().optional(),
  contract_vehicles: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()),
});

export default function NewPartnerPage() {
  const router = useRouter();
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = { ...values, attachments: values.attachments?.length ? values.attachments : null };
    const { error } = await supabase.from("partners").insert([payload]);

    if (error) {
      console.error("Error creating partner:", error);
      return;
    }

    router.push("/partners");
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/partners">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Partner</h1>
      </div>

      <Card>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Link href="/partners">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Partner
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
