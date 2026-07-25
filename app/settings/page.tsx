"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Shield,
  Bell,
  Database,
  Settings as SettingsIcon,
} from "lucide-react";

export default function SettingsPage() {
  // Profile state (persisted in localStorage for now)
  const [profile, setProfile] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("did-settings");
      if (saved) return JSON.parse(saved);
    }
    return {
      name: "Tony Wood",
      email: "tony@dataisdata.com",
      role: "Administrator",
      org: "DataIsData",
      bio: "",
    };
  });

  function saveProfile() {
    localStorage.setItem("did-settings", JSON.stringify(profile));
    toast.success("Settings saved");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Settings</h1>
        <p className="text-[#6B7280]">Manage your profile and preferences.</p>
      </div>

      {/* Profile */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[#111827]">Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={profile.org}
                onChange={(e) => setProfile({ ...profile, org: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio (Optional)</Label>
            <Textarea
              placeholder="Tell us about yourself..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} className="bg-primary hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security notice */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[#111827]">Security</CardTitle>
              <CardDescription>Authentication and access control.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-100">
            <div>
              <p className="text-sm font-bold text-amber-800">No authentication configured</p>
              <p className="text-xs text-amber-600 mt-0.5">
                This app currently runs without login. Add Supabase Auth to secure access.
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">Internal Only</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[#111827]">Database</CardTitle>
              <CardDescription>Supabase connection info.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-[#6B7280]">Provider</span>
              <Badge className="bg-green-100 text-green-700 border-none">Supabase (PostgreSQL)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-[#6B7280]">Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-[#6B7280]">Storage Bucket</span>
              <span className="text-sm font-medium text-[#111827]">crm-attachments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
