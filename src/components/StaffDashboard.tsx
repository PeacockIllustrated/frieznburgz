"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, GraduationCap, Megaphone, ArrowRight, Users, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isTomorrow, isToday } from "date-fns";
import { getLocationDisplayName } from "@/lib/config";

interface Shift {
    id: string;
    startTime: Timestamp;
    endTime: Timestamp;
    role: string;
}

interface Colleague {
    id: string;
    name: string;
    role: string;
    endTime: Timestamp;
}

export function StaffDashboard() {
    const { user, userProfile } = useAuth();
    const firstName = userProfile?.firstName || "Team Member";
    const [nextShift, setNextShift] = useState<Shift | null>(null);
    const [loadingShift, setLoadingShift] = useState(true);
    const [colleagues, setColleagues] = useState<Colleague[]>([]);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                const now = new Date();

                // 1. Fetch Next Shift
                const nextShiftQ = query(
                    collection(db, "shifts"),
                    where("staffId", "==", user.uid),
                    where("startTime", ">=", Timestamp.fromDate(now)),
                    where("published", "==", true),
                    orderBy("startTime", "asc"),
                    limit(1)
                );

                const nextShiftSnapshot = await getDocs(nextShiftQ);
                if (!nextShiftSnapshot.empty) {
                    const doc = nextShiftSnapshot.docs[0];
                    setNextShift({ id: doc.id, ...doc.data() } as Shift);
                }

                // 2. Fetch Team on Shift (Colleagues)
                // We need to fetch all active shifts and filter for the current user's location (if known) or just show all if small team.
                // Ideally, we filter by location. Let's assume userProfile has locationId.
                // If not, we might show all. For safety, let's fetch all active shifts and filter client side or if we have locationId use it.
                // Since `userProfile` might not be fully loaded or locationId might be missing, let's just fetch all active shifts and filter out self.

                const activeShiftsQ = query(
                    collection(db, "shifts"),
                    where("startTime", "<=", Timestamp.fromDate(now)),
                    where("endTime", ">", Timestamp.fromDate(now)),
                    where("published", "==", true)
                );

                const activeShiftsSnapshot = await getDocs(activeShiftsQ);

                // We need staff names. This might require fetching staff profiles if not in shift.
                // The shift object usually has staffId.
                // Let's fetch all staff profiles to map names. (Optimizable later)
                const staffSnapshot = await getDocs(collection(db, "staff"));
                const staffMap = new Map(staffSnapshot.docs.map(d => {
                    const data = d.data();
                    return [d.id, `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown'];
                }));

                const activeColleagues = activeShiftsSnapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            staffId: data.staffId,
                            name: staffMap.get(data.staffId) || 'Unknown',
                            role: data.role,
                            endTime: data.endTime,
                            locationId: data.locationId
                        };
                    })
                    .filter(shift => shift.staffId !== user.uid) // Exclude self
                    // Optional: Filter by same location if user has locationId
                    // .filter(shift => !userProfile?.locationId || shift.locationId === userProfile.locationId)
                    .map(shift => ({
                        id: shift.id,
                        name: shift.name,
                        role: shift.role,
                        endTime: shift.endTime
                    }));

                setColleagues(activeColleagues);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoadingShift(false);
            }
        }

        fetchData();
    }, [user, userProfile]);

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

                {/* Team on Shift Widget */}
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Team on Shift
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {colleagues.length === 0 ? (
                                <p className="text-sm text-text-muted">No other team members on shift right now.</p>
                            ) : (
                                colleagues.slice(0, 3).map((colleague) => (
                                    <div key={colleague.id} className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-bold text-brand-dark">{colleague.name}</p>
                                            <p className="text-[10px] text-text-muted">{colleague.role}</p>
                                        </div>
                                        <div className="text-right text-[10px] text-text-muted">
                                            Until {format(colleague.endTime.toDate(), "HH:mm")}
                                        </div>
                                    </div>
                                ))
                            )}
                            {colleagues.length > 3 && (
                                <p className="text-xs text-text-muted pt-1">
                                    + {colleagues.length - 3} more
                                </p>
                            )}
                        </div>
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
                            <p className="text-2xl font-black font-fraunces text-brand-dark">Handbook</p>
                            <p className="text-sm text-text-muted">Keep your knowledge fresh.</p>
                        </div>
                        <Button variant="link" className="px-0 text-brand-khaki mt-auto pt-4 h-auto p-0 font-bold" asChild>
                            <Link href="/training">Continue Training <ArrowRight className="ml-1 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Quick Links Widget */}
                <Card className="border-l-4 border-l-brand-dark hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Quick Actions
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-brand-dark" />
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button variant="outline" className="justify-start gap-2" asChild>
                            <Link href="/wastage">
                                <Trash2 className="h-4 w-4 text-brand-red" />
                                Report Wastage
                            </Link>
                        </Button>
                        <Button variant="outline" className="justify-start gap-2" asChild>
                            <Link href="/rota">
                                <CalendarClock className="h-4 w-4 text-brand-dark" />
                                View Rota
                            </Link>
                        </Button>
                        <Button variant="outline" className="justify-start gap-2" asChild>
                            <Link href="/training">
                                <GraduationCap className="h-4 w-4 text-brand-khaki" />
                                Employee Handbook
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* News / Announcements Widget */}
                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Latest News
                        </CardTitle>
                        <Megaphone className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-3">
                                <p className="font-bold text-brand-dark text-sm">New Summer Menu Launch!</p>
                                <p className="text-xs text-text-muted mt-1">
                                    Get ready for the new range of milkshakes and summer specials launching next week. Make sure to check the recipes in the handbook.
                                </p>
                            </div>
                            <div>
                                <p className="font-bold text-brand-dark text-sm">Staff Party</p>
                                <p className="text-xs text-text-muted mt-1">
                                    Save the date! Annual staff gathering on the 25th. Food and drinks provided.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
