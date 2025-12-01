"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, GraduationCap, Megaphone, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isTomorrow, isToday } from "date-fns";

interface Shift {
    id: string;
    startTime: Timestamp;
    endTime: Timestamp;
    role: string;
}

export function StaffDashboard() {
    const { user, userProfile } = useAuth();
    const firstName = userProfile?.firstName || "Team Member";
    const [nextShift, setNextShift] = useState<Shift | null>(null);
    const [loadingShift, setLoadingShift] = useState(true);

    useEffect(() => {
        async function fetchNextShift() {
            if (!user) return;

            try {
                const now = new Date();
                const q = query(
                    collection(db, "shifts"),
                    where("staffId", "==", user.uid),
                    where("startTime", ">=", Timestamp.fromDate(now)),
                    where("published", "==", true),
                    orderBy("startTime", "asc"),
                    limit(1)
                );

                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    setNextShift({ id: doc.id, ...doc.data() } as Shift);
                }
            } catch (error) {
                console.error("Error fetching next shift:", error);
            } finally {
                setLoadingShift(false);
            }
        }

        fetchNextShift();
    }, [user]);

    const getShiftLabel = (date: Date) => {
        if (isToday(date)) return "Today";
        if (isTomorrow(date)) return "Tomorrow";
        return format(date, "EEEE");
    };

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h2 className="text-3xl font-black font-fraunces text-brand-dark tracking-tight">
                    Welcome back, {firstName}
                </h2>
                <p className="text-text-muted font-medium mt-1">Here's what's happening today.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Next Shift Widget */}
                <Card className="border-l-4 border-l-brand-red hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Next Shift
                        </CardTitle>
                        <CalendarClock className="h-4 w-4 text-brand-red" />
                    </CardHeader>
                    <CardContent>
                        {loadingShift ? (
                            <div className="text-sm text-text-muted">Loading schedule...</div>
                        ) : nextShift ? (
                            <div className="space-y-1">
                                <p className="text-2xl font-black font-fraunces text-brand-dark">
                                    {getShiftLabel(nextShift.startTime.toDate())}
                                </p>
                                <p className="text-lg font-medium text-text-primary">
                                    {format(nextShift.startTime.toDate(), "HH:mm")} - {format(nextShift.endTime.toDate(), "HH:mm")}
                                </p>
                                <p className="text-sm text-text-muted">{nextShift.role}</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-brand-dark">No upcoming shifts</p>
                                <p className="text-sm text-text-muted">Enjoy your time off!</p>
                            </div>
                        )}
                        <Button variant="link" className="px-0 text-brand-red mt-4 h-auto p-0 font-bold" asChild>
                            <Link href="/rota">View Full Rota <ArrowRight className="ml-1 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Training Status Widget */}
                <Card className="border-l-4 border-l-brand-khaki hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Training
                        </CardTitle>
                        <GraduationCap className="h-4 w-4 text-brand-khaki" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-2xl font-black font-fraunces text-brand-dark">2 Modules</p>
                            <p className="text-sm text-text-muted">Outstanding to complete.</p>
                        </div>
                        <Button variant="link" className="px-0 text-brand-khaki mt-auto pt-4 h-auto p-0 font-bold" asChild>
                            <Link href="/training">Continue Training <ArrowRight className="ml-1 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* News / Announcements Widget */}
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Latest News
                        </CardTitle>
                        <Megaphone className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border-b border-border pb-3 last:border-0 last:pb-0">
                                <p className="font-bold text-brand-dark text-sm">New Summer Menu Launch!</p>
                                <p className="text-xs text-text-muted mt-1 line-clamp-2">
                                    Get ready for the new range of milkshakes and summer specials launching next week.
                                </p>
                            </div>
                            <div className="border-b border-border pb-3 last:border-0 last:pb-0">
                                <p className="font-bold text-brand-dark text-sm">Staff Party</p>
                                <p className="text-xs text-text-muted mt-1">
                                    Save the date! Annual staff gathering on the 25th.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
