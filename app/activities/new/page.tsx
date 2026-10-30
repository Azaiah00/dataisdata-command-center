"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

function NewActivity() {
  const router = useRouter();
  const sp = useSearchParams();
  const accountId = sp.get("account_id");
  const contactId = sp.get("contact_id");
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="page-title">Log Activity</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity details</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm
            initial={{
              account_id: accountId,
              engagement_id: sp.get("engagement_id"),
              opportunity_id: sp.get("opportunity_id"),
              contact_ids: contactId ? [contactId] : [],
            }}
            onDone={(id) => {
              router.push(`/activities/${id}`);
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewActivityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="spinner" /></div>}>
      <NewActivity />
    </Suspense>
  );
}
