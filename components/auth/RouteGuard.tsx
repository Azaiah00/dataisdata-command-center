"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccess } from "./AccessProvider";
import { resolveRoute, MODULE_MAP } from "@/lib/access/modules";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";
import { Lock, Sparkles } from "lucide-react";

function NoAccess({ title, body }: { title: string; body: string }) {
  const { firstAccessiblePath } = useAccess();
  const home = firstAccessiblePath();
  return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-5">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      {home && (
        <Link href={home}>
          <Button>Go to my workspace</Button>
        </Link>
      )}
    </div>
  );
}

export function AwaitingAccess() {
  const { user } = useAccess();
  return (
    <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
      <BrandMark size={72} rounded="rounded-3xl" className="mx-auto" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome{user ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-lg">
          Your DataIsData seat is active. An administrator is setting up what you can see — once they turn modules on,
          they will appear here automatically after you refresh.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
        <Sparkles className="w-4 h-4" /> Questions? Contact Tony Wood or Azaiah Wood.
      </div>
    </div>
  );
}

/** Blocks any page the effective user is not allowed to open. */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, isAdmin, firstAccessiblePath } = useAccess();
  const req = resolveRoute(pathname);
  const home = firstAccessiblePath();

  const dashboardBlocked = req.kind === "module" && req.module === "dashboard" && !can("dashboard", "view");

  useEffect(() => {
    // Users without the dashboard land on their first permitted module instead.
    if (dashboardBlocked && home && home !== "/") router.replace(home);
  }, [dashboardBlocked, home, router]);

  if (req.kind === "public" || req.kind === "self") return <>{children}</>;

  if (req.kind === "admin") {
    if (isAdmin) return <>{children}</>;
    return <NoAccess title="Admins only" body="Seat and permission management is limited to Owner and Admin seats." />;
  }

  if (dashboardBlocked) {
    if (!home) return <AwaitingAccess />;
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!can(req.module, req.action)) {
    const label = MODULE_MAP[req.module]?.label || "this page";
    const verb = req.action === "view" ? "view" : req.action === "create" ? "create items in" : req.action === "edit" ? "edit items in" : "delete items in";
    return (
      <NoAccess
        title="You don't have access to this page"
        body={`Your seat isn't allowed to ${verb} ${label}. If you need it, ask an administrator to turn it on.`}
      />
    );
  }
  return <>{children}</>;
}
