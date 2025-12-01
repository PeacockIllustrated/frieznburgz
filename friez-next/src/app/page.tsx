"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { StaffDashboard } from "@/components/StaffDashboard";
import { AppShell } from "@/components/layout/AppShell";

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-brand-white">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const isStaff = userProfile?.role === 'staff';

  return (
    <AppShell>
      <h1 className="mb-6 font-fraunces text-4xl font-black text-brand-red uppercase tracking-tighter">
        Dashboard
      </h1>
      {isStaff ? <StaffDashboard /> : <AdminDashboard />}
    </AppShell>
  );
}
