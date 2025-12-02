"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { locations, getLocationDisplayName } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2, AlertTriangle, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SpecialsUpdates } from "@/components/SpecialsUpdates";

interface StaffData {
    uid: string;
    locationId?: string;
    firstName?: string;
    lastName?: string;
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

interface StockItem {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    reorderPoint?: number;
    locationName: string;
}

interface WastageEntry {
    id: string;
    item: string;
    quantity: number;
    unit: string;
    reason: string;
    timestamp: Timestamp;
    locationName: string;
}

interface ActiveShift {
    id: string;
    staffName: string;
    role: string;
    startTime: Timestamp;
    endTime: Timestamp;
    locationName: string;
}

export function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [staffSummary, setStaffSummary] = useState<StaffSummary>({
        totalEmployees: 0,
        upToDateCount: 0,
        locationAverages: [],
    });
    const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
    const [recentWastage, setRecentWastage] = useState<WastageEntry[]>([]);
    const [staffOnDuty, setStaffOnDuty] = useState<ActiveShift[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Staff & User Progress (Existing Logic)
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

                // 2. Fetch Low Stock (Aggregated from all locations)
                const lowStockPromises = locations.map(async (loc) => {
                    const itemsRef = collection(db, "locations", loc.id, "items");
                    // Firestore doesn't support inequality on different fields easily without composite indexes
                    // So we fetch all and filter client side for now (assuming inventory isn't huge)
                    // Or we can just fetch items where reorderPoint exists and check.
                    // For efficiency, let's just fetch all items for now.
                    const snapshot = await getDocs(itemsRef);
                    return snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as any))
                        .filter(item => item.reorderPoint !== undefined && item.currentStock <= item.reorderPoint)
                        .map(item => ({
                            id: item.id,
                            name: item.name,
                            currentStock: item.currentStock,
                            unit: item.unit,
                            reorderPoint: item.reorderPoint,
                            locationName: loc.name
                        }));
                });

                const allLowStock = (await Promise.all(lowStockPromises)).flat();
                setLowStockItems(allLowStock.slice(0, 5)); // Top 5

                // 3. Fetch Recent Wastage (Aggregated)
                const wastagePromises = locations.map(async (loc) => {
                    const q = query(
                        collection(db, "locations", loc.id, "wastage_log"),
                        orderBy("timestamp", "desc"),
                        limit(5)
                    );
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        locationName: loc.name
                    } as WastageEntry));
                });

                const allWastage = (await Promise.all(wastagePromises)).flat();
                allWastage.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                setRecentWastage(allWastage.slice(0, 5));

                // 4. Fetch Staff on Duty
                const now = new Date();
                const shiftsQ = query(
                    collection(db, "shifts"),
                    where("startTime", "<=", Timestamp.fromDate(now)),
                    where("endTime", ">", Timestamp.fromDate(now)),
                    where("published", "==", true)
                );
                const shiftsSnapshot = await getDocs(shiftsQ);

                // Need to map staffIds to names
                const staffMap = new Map(staffData.map(s => [s.uid, `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown']));

                const activeShifts = shiftsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        staffName: staffMap.get(data.staffId) || 'Unknown',
                        role: data.role,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        locationName: getLocationDisplayName(data.locationId)
                    } as ActiveShift;
                });
                setStaffOnDuty(activeShifts);

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
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            On Duty Now
                        </CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-fraunces text-brand-dark tracking-tight">{staffOnDuty.length}</div>
                        <p className="text-xs text-text-muted mt-1 font-medium">
                            Staff currently working
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider">
                            Low Stock
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-fraunces text-brand-dark tracking-tight">{lowStockItems.length}</div>
                        <p className="text-xs text-text-muted mt-1 font-medium">
                            Items below reorder point
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {/* Specials Updates - Takes up full height on left/center */}
                <div className="col-span-1 lg:col-span-1 lg:row-span-2 h-[600px]">
                    <SpecialsUpdates />
                </div>

                {/* Location Performance */}
                <Card className="col-span-1 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-xl">Training Performance</CardTitle>
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

                {/* Staff On Duty List */}
                <Card className="col-span-1 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-xl">Staff On Duty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {staffOnDuty.length === 0 ? (
                                <p className="text-sm text-text-muted">No staff currently on shift.</p>
                            ) : (
                                staffOnDuty.map((shift) => (
                                    <div key={shift.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-bold text-brand-dark">{shift.staffName}</p>
                                            <p className="text-xs text-text-muted">{shift.role} • {shift.locationName}</p>
                                        </div>
                                        <div className="text-right text-xs font-medium text-brand-red">
                                            {format(shift.startTime.toDate(), "HH:mm")} - {format(shift.endTime.toDate(), "HH:mm")}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Wastage & Low Stock (Combined Column) */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Low Stock Widget */}
                        <Card className="border-t-4 border-t-orange-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    Low Stock Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {lowStockItems.length === 0 ? (
                                        <p className="text-sm text-text-muted">Inventory levels are healthy.</p>
                                    ) : (
                                        lowStockItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-brand-dark truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                                                        {item.currentStock} {item.unit}
                                                    </Badge>
                                                    <span className="text-[10px] text-text-muted uppercase">{item.locationName}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Wastage Widget */}
                        <Card className="border-t-4 border-t-brand-khaki">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-oswald font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 text-brand-khaki" />
                                    Recent Wastage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentWastage.length === 0 ? (
                                        <p className="text-sm text-text-muted">No recent wastage logged.</p>
                                    ) : (
                                        recentWastage.map((waste) => (
                                            <div key={waste.id} className="flex items-center justify-between text-sm">
                                                <div>
                                                    <p className="font-medium text-brand-dark">{waste.item}</p>
                                                    <p className="text-[10px] text-text-muted">{waste.reason}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-brand-red">-{waste.quantity} {waste.unit}</p>
                                                    <p className="text-[10px] text-text-muted">{waste.locationName}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
