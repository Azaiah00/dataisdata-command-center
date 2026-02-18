"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Contact } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Building2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RELATIONSHIP_HEALTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          accounts (
            name
          )
        `)
        .order("full_name");

      if (error) {
        console.error("Error fetching contacts:", error);
      } else {
        setContacts(data || []);
      }
      setLoading(false);
    }

    fetchContacts();
  }, []);

  const columns = [
    {
      header: "Name",
      accessorKey: "full_name",
      cell: (contact: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{contact.full_name}</span>
            <span className="text-xs text-slate-500">{contact.title_role}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account_id",
      cell: (contact: any) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <Building2 className="w-3 h-3" />
          {contact.accounts?.name || "No Account"}
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (contact: Contact) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <Mail className="w-3 h-3" />
          {contact.email || "N/A"}
        </div>
      ),
    },
    {
      header: "Health",
      accessorKey: "relationship_health",
      cell: (contact: Contact) => {
        const colors: Record<string, string> = {
          Strong: "text-green-600 bg-green-50",
          Warm: "text-amber-600 bg-amber-50",
          Cold: "text-blue-600 bg-blue-50",
        };
        return (
          <Badge
            className={cn(
              "font-medium border-none",
              colors[contact.relationship_health] || "bg-slate-50"
            )}
          >
            {contact.relationship_health}
          </Badge>
        );
      },
    },
    {
      header: "Influence",
      accessorKey: "influence_level",
      cell: (contact: Contact) => (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                i < (contact.influence_level || 0) ? "bg-amber-500" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1">Manage stakeholders and key decision makers.</p>
        </div>
        <Link href="/contacts/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={contacts}
          onRowClick={(contact) => {
            window.location.href = `/contacts/${contact.id}`;
          }}
        />
      )}
    </div>
  );
}
