"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Briefcase,
  TrendingUp,
  Handshake,
  Calendar,
  ExternalLink,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface DocEntry {
  url: string;
  fileName: string;
  sourceType: "Engagement" | "Opportunity" | "Partner" | "Activity";
  sourceName: string;
  sourceId: string;
  sourceDate: string;
}

const sourceIcons = {
  Engagement: Briefcase,
  Opportunity: TrendingUp,
  Partner: Handshake,
  Activity: Calendar,
};

const sourceColors = {
  Engagement: "bg-blue-100 text-blue-700",
  Opportunity: "bg-purple-100 text-purple-700",
  Partner: "bg-amber-100 text-amber-700",
  Activity: "bg-green-100 text-green-700",
};

const sourceLinks = {
  Engagement: "/engagements",
  Opportunity: "/pipeline",
  Partner: "/partners",
  Activity: "/activities",
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDocuments() {
      const allDocs: DocEntry[] = [];

      // Engagements
      const { data: engs } = await supabase
        .from("engagements")
        .select("id, name, attachments, created_at")
        .not("attachments", "is", null);
      (engs || []).forEach((e) =>
        (e.attachments || []).forEach((url: string) =>
          allDocs.push({
            url,
            fileName: decodeURIComponent(url.split("/").pop() || "file"),
            sourceType: "Engagement",
            sourceName: e.name,
            sourceId: e.id,
            sourceDate: e.created_at,
          })
        )
      );

      // Opportunities
      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, name, attachments, created_at")
        .not("attachments", "is", null);
      (opps || []).forEach((o) =>
        (o.attachments || []).forEach((url: string) =>
          allDocs.push({
            url,
            fileName: decodeURIComponent(url.split("/").pop() || "file"),
            sourceType: "Opportunity",
            sourceName: o.name,
            sourceId: o.id,
            sourceDate: o.created_at,
          })
        )
      );

      // Partners
      const { data: parts } = await supabase
        .from("partners")
        .select("id, name, attachments, created_at")
        .not("attachments", "is", null);
      (parts || []).forEach((p) =>
        (p.attachments || []).forEach((url: string) =>
          allDocs.push({
            url,
            fileName: decodeURIComponent(url.split("/").pop() || "file"),
            sourceType: "Partner",
            sourceName: p.name,
            sourceId: p.id,
            sourceDate: p.created_at,
          })
        )
      );

      // Activities
      const { data: acts } = await supabase
        .from("activities")
        .select("id, activity_type, summary, attachments, created_at")
        .not("attachments", "is", null);
      (acts || []).forEach((a) =>
        (a.attachments || []).forEach((url: string) =>
          allDocs.push({
            url,
            fileName: decodeURIComponent(url.split("/").pop() || "file"),
            sourceType: "Activity",
            sourceName: a.summary || a.activity_type,
            sourceId: a.id,
            sourceDate: a.created_at,
          })
        )
      );

      // Sort by most recent
      allDocs.sort((a, b) => new Date(b.sourceDate).getTime() - new Date(a.sourceDate).getTime());
      setDocs(allDocs);
      setLoading(false);
    }

    fetchDocuments();
  }, []);

  const filtered = search
    ? docs.filter(
        (d) =>
          d.fileName.toLowerCase().includes(search.toLowerCase()) ||
          d.sourceName.toLowerCase().includes(search.toLowerCase()) ||
          d.sourceType.toLowerCase().includes(search.toLowerCase())
      )
    : docs;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Documents</h1>
          <p className="text-[#6B7280]">All uploaded files across engagements, pipeline, partners, and activities.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">
              {filtered.length} Document{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map((doc, idx) => {
                const Icon = sourceIcons[doc.sourceType];
                return (
                  <div key={`${doc.url}-${idx}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-blue-600 hover:underline truncate block"
                      >
                        {doc.fileName}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Icon className="w-3 h-3 text-gray-400" />
                        <Link
                          href={`${sourceLinks[doc.sourceType]}/${doc.sourceId}`}
                          className="text-xs text-[#6B7280] hover:text-blue-600 truncate"
                        >
                          {doc.sourceName}
                        </Link>
                      </div>
                    </div>
                    <Badge className={`text-[10px] h-5 px-2 border-none ${sourceColors[doc.sourceType]}`}>
                      {doc.sourceType}
                    </Badge>
                    <span className="text-xs text-gray-400 hidden sm:block">{formatDate(doc.sourceDate)}</span>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#111827]">No documents yet</h3>
            <p className="text-sm text-[#6B7280] mt-1">
              Upload files when creating or editing engagements, pipeline items, partners, or activities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
