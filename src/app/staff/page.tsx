"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLocationDisplayName } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/AppShell";
import {
    Mail,
    Phone,
    Calendar,
    BookOpen,
    GraduationCap,
    Search,
    UserPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StaffMember {
    uid: string;
    name: string;
    email: string;
    role: string;
    phone: string;
    startDate: string;
    locationId: string;
}

interface UserProgress {
    readSections?: string[];
    quizHistory?: { score: number; total: number }[];
}

interface MergedStaffData extends StaffMember {
    locationName: string;
    handbookCompletion: number;
    averageQuizScore: number;
}

const TOTAL_HANDBOOK_SECTIONS = 12;

import { AddStaffDrawer } from "@/components/staff/AddStaffDrawer";

export default function StaffPage() {
    const [staffList, setStaffList] = useState<MergedStaffData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    async function fetchStaffData() {
        setLoading(true);
        try {
            const [staffSnapshot, usersSnapshot] = await Promise.all([
                getDocs(collection(db, "staff")),
                getDocs(collection(db, "users"))
            ]);

            const staffData = staffSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as StaffMember[];

            const progressData: Record<string, UserProgress> = {};
            usersSnapshot.forEach(doc => {
                progressData[doc.id] = doc.data() as UserProgress;
            });

            const mergedData = staffData.map(staff => {
                const userProgress = progressData[staff.uid] || { readSections: [], quizHistory: [] };

                const readCount = userProgress.readSections?.length || 0;
                const handbookCompletion = Math.min(100, Math.round((readCount / TOTAL_HANDBOOK_SECTIONS) * 100));

                let averageQuizScore = 0;
                if (userProgress.quizHistory && userProgress.quizHistory.length > 0) {
                    const totalScore = userProgress.quizHistory.reduce((sum, quiz) => sum + (quiz.score / quiz.total), 0);
                    averageQuizScore = Math.round((totalScore / userProgress.quizHistory.length) * 100);
                }

                return {
                    ...staff,
                    locationName: getLocationDisplayName(staff.locationId),
                    handbookCompletion,
                    averageQuizScore
                };
            });

            // Sort by location then name
            mergedData.sort((a, b) => {
                if (a.locationName !== b.locationName) return a.locationName.localeCompare(b.locationName);
                return a.name.localeCompare(b.name);
            });

            setStaffList(mergedData);
        } catch (error) {
            console.error("Error fetching staff data:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStaffData();
    }, []);

    // Group by location
    const groupedStaff = staffList.reduce((acc, staff) => {
        const location = staff.locationName || 'Unassigned';
        if (!acc[location]) acc[location] = [];
        acc[location].push(staff);
        return acc;
    }, {} as Record<string, MergedStaffData[]>);

    const filteredLocations = Object.keys(groupedStaff).filter(location => {
        if (!searchTerm) return true;
        const locationMatch = location.toLowerCase().includes(searchTerm.toLowerCase());
        const staffMatch = groupedStaff[location].some(staff =>
            staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            staff.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return locationMatch || staffMatch;
    }).sort();

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Staff Management</h1>
                        <p className="text-text-muted font-medium">View employee details and training progress.</p>
                    </div>
                    <Button
                        onClick={() => setIsDrawerOpen(true)}
                        className="bg-brand-red text-white font-oswald uppercase tracking-wide"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> Add Staff
                    </Button>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <Input
                        placeholder="Search staff by name or location..."
                        className="pl-9 bg-surface"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Staff List */}
                {loading ? (
                    <div className="text-center py-12 text-text-muted">Loading staff data...</div>
                ) : (
                    <div className="space-y-8">
                        {filteredLocations.map(location => {
                            const locationStaff = groupedStaff[location].filter(staff =>
                                !searchTerm ||
                                staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                staff.email.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (locationStaff.length === 0) return null;

                            return (
                                <div key={location} className="space-y-4">
                                    <h3 className="font-fraunces font-bold text-2xl text-brand-dark border-b border-border pb-2">
                                        {location}
                                    </h3>
                                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                        {locationStaff.map(staff => (
                                            <Card key={staff.uid} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-brand-khaki">
                                                <CardHeader className="pb-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle className="text-xl font-bold text-brand-dark">{staff.name}</CardTitle>
                                                            <p className="text-sm font-medium text-brand-red uppercase tracking-wide mt-1">{staff.role || 'Employee'}</p>
                                                        </div>
                                                        {staff.handbookCompletion === 100 && (
                                                            <Badge className="bg-green-600 hover:bg-green-700">Certified</Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {/* Contact Info */}
                                                    <div className="space-y-2 text-sm text-text-secondary">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-text-muted" />
                                                            <span className="truncate">{staff.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4 text-text-muted" />
                                                            <span>{staff.phone || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-text-muted" />
                                                            <span>Started: {staff.startDate || 'N/A'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-border my-2" />

                                                    {/* Training Progress */}
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs font-bold uppercase text-text-muted tracking-wider">
                                                                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Handbook</span>
                                                                <span>{staff.handbookCompletion}%</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full transition-all duration-500", staff.handbookCompletion === 100 ? "bg-green-500" : "bg-brand-khaki")}
                                                                    style={{ width: `${staff.handbookCompletion}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs font-bold uppercase text-text-muted tracking-wider">
                                                                <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Quiz Avg</span>
                                                                <span>{staff.averageQuizScore}%</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-brand-red rounded-full transition-all duration-500"
                                                                    style={{ width: `${staff.averageQuizScore}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <AddStaffDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    onStaffAdded={fetchStaffData}
                />
            </div>
        </AppShell>
    );
}
