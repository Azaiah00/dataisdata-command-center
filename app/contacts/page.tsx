"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Contact } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Building2, ArrowUpRight, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor } from "@/lib/utils";

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
          ),
          account_contacts (
            accounts (
              name
            )
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
      header: "Contact",
      accessorKey: "full_name",
      cell: (contact: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {contact.full_name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111827] text-sm truncate">{contact.full_name}</span>
            <span className="text-xs text-[#6B7280]">{contact.title_role}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Accounts",
      accessorKey: "account_id",
      cell: (contact: any) => {
        const linkedAccounts = contact.account_contacts?.map((ac: any) => ac.accounts?.name).filter(Boolean) || [];
        const primaryAccount = contact.accounts?.name;
        
        // Combine primary and linked, ensuring no duplicates
        const allAccounts = Array.from(new Set([primaryAccount, ...linkedAccounts])).filter(Boolean);

        if (allAccounts.length === 0) return <span className="text-xs text-slate-400 italic">No Account</span>;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{allAccounts[0]}</span>
            </div>
            {allAccounts.length > 1 && (
              <span className="text-[10px] text-blue-600 font-medium ml-5">
                +{allAccounts.length - 1} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (contact: Contact) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <Mail className="w-3.5 h-3.5" />
          {contact.email || "N/A"}
        </div>
      ),
    },
    {
      header: "Health",
      accessorKey: "relationship_health",
      cell: (contact: Contact) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            getStatusColor(contact.relationship_health)
          )}
        >
          {contact.relationship_health}
        </Badge>
      ),
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
    {
      header: "",
      accessorKey: "actions",
      cell: (contact: Contact) => (
        <div className="flex justify-end gap-2">
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-blue-600 hover:bg-blue-50">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href={`/contacts/${contact.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-blue-600 hover:bg-blue-700 hover:text-white">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Contacts</h1>
          <p className="text-[#6B7280]">Manage stakeholders and key decision makers.</p>
        </div>
        <Link href="/contacts/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
