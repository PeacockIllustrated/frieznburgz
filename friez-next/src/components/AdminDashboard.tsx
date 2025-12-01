"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLocationDisplayName } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2 } from "lucide-react";

interface StaffData {
    uid: string;
    locationId?: string;
}

interface UserProgress {
    readSections?: string[];
    quizHistory?: { score: number; total: number }[];
}

interface LocationAverage {
    name: string;
    score: number;
}

interface StaffSummary {
    totalEmployees: number;
    upToDateCount: number;
    locationAverages: LocationAverage[];
}

export function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [staffSummary, setStaffSummary] = useState<StaffSummary>({
        totalEmployees: 0,
        upToDateCount: 0,
        locationAverages: [],
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const [staffSnapshot, usersSnapshot] = await Promise.all([
                    getDocs(collection(db, "staff")),
                    getDocs(collection(db, "users")),
                ]);

                const staffData = staffSnapshot.docs.map((doc) => ({
                    uid: doc.id,
                    ...doc.data(),
                })) as StaffData[];

                const progressData: Record<string, UserProgress> = {};
                usersSnapshot.forEach((doc) => {
                    progressData[doc.id] = doc.data() as UserProgress;
                });

                const TOTAL_HANDBOOK_SECTIONS = 12;
                let upToDate = 0;
                const locationScores: Record<string, { totalScore: number; quizCount: number }> = {};

                staffData.forEach((staff) => {
                    const userProgress = progressData[staff.uid] || { readSections: [], quizHistory: [] };
                    const location = staff.locationId || "Unassigned";

                    if (userProgress.readSections && userProgress.readSections.length >= TOTAL_HANDBOOK_SECTIONS) {
                        upToDate++;
                    }

                    if (!locationScores[location]) {
                        locationScores[location] = { totalScore: 0, quizCount: 0 };
                    }

                    if (userProgress.quizHistory && userProgress.quizHistory.length > 0) {
                        userProgress.quizHistory.forEach((quiz) => {
                            locationScores[location].totalScore += quiz.score / quiz.total;
                            locationScores[location].quizCount++;
                        });
                    }
                });

                const averages = Object.keys(locationScores).map((locId) => {
                    const data = locationScores[locId];
                    const average = data.quizCount > 0 ? (data.totalScore / data.quizCount) * 100 : 0;
                    return { name: getLocationDisplayName(locId), score: Math.round(average) };
                });

                setStaffSummary({
                    totalEmployees: staffData.length,
                    upToDateCount: upToDate,
                    locationAverages: averages,
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return <div className="text-brand-dark font-medium">Loading dashboard data...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-brand-red">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Total Staff
                        </CardTitle>
                        <Users className="h-4 w-4 text-brand-red" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-fraunces text-brand-dark tracking-tight">{staffSummary.totalEmployees}</div>
                        <p className="text-xs text-text-muted mt-1 font-medium">
                            Active employees
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-brand-khaki">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Up to Date
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-brand-khaki" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-fraunces text-brand-dark tracking-tight">{staffSummary.upToDateCount}</div>
                        <p className="text-xs text-text-muted mt-1 font-medium">
                            Completed all training
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Location Performance */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-xl">Location Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {staffSummary.locationAverages.map((loc) => (
                                <div key={loc.name} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold font-futura text-brand-dark">{loc.name}</span>
                                        <span className="font-oswald font-medium text-brand-red">{loc.score}%</span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-surface-hover">
                                        <div
                                            className="h-full bg-brand-red transition-all duration-500 ease-in-out"
                                            style={{ width: `${loc.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {staffSummary.locationAverages.length === 0 && (
                                <p className="text-sm text-text-muted">No quiz data available yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity / Quick Actions Placeholder */}
                <Card className="col-span-1 bg-brand-red text-white border-none">
                    <CardHeader>
                        <CardTitle className="text-white text-xl">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <p className="text-white/90 font-medium font-futura">
                            Manage your staff, check stock levels, or update the handbook directly from here.
                        </p>
                        {/* Add buttons or links here if needed */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
