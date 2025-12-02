"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SpecialsUpdates } from "@/components/SpecialsUpdates";

export default function SpecialsPage() {
    const { user, loading } = useAuth();
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

    return (
        <AppShell>
            <div className="h-[calc(100vh-8rem)]">
                <SpecialsUpdates />
            </div>
        </AppShell>
    );
}
