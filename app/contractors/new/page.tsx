"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  title_role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
});

export default function NewContractorPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      title_role: "",
      email: "",
      phone: "",
      status: "Active",
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { error } = await supabase.from("contractors").insert([{
      full_name: values.full_name,
      title_role: values.title_role || null,
      email: values.email || null,
      phone: values.phone || null,
      status: values.status,
      notes: values.notes || null,
    }]);

    if (error) {
      toast.error("Failed to create contractor");
      console.error(error);
      return;
    }

    toast.success("Contractor created");
    router.push("/contractors");
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractors">
          <Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">New Contractor</h1>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Contractor Profile</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g. John Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title_role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title / Role</FormLabel>
                    <FormControl><Input placeholder="e.g. IT Security Analyst" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="(555) 555-5555" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional context..." className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-4">
                <Link href="/contractors"><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Create Contractor</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
