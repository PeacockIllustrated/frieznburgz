"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Copy, Calendar as CalendarIcon, CheckCircle2, MapPin, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddShiftDrawer } from "@/components/rota/AddShiftDrawer";
import { ShiftCard } from "@/components/rota/ShiftCard";
import { WeekGrid } from "@/components/rota/WeekGrid";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";

// Types
export interface Shift {
    id: string;
    staffId: string;
    staffName: string;
    role: string;
    locationId: string;
    startTime: Date; // Changed to Date
    endTime: Date; // Changed to Date
    weekId: string;
    published: boolean;
    notes?: string;
}

function parseDate(date: any): Date {
    if (!date) return new Date();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
}

export default function RotaPage() {
    const { userProfile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydrate state from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedDate = localStorage.getItem("rota_currentDate");
            const savedLocation = localStorage.getItem("rota_currentLocationId");

            if (savedDate) {
                const date = new Date(savedDate);
                setCurrentDate(date);
                // Sync selectedDate to start of week of saved date
                setSelectedDate(startOfWeek(date, { weekStartsOn: 1 }));
            }

            if (savedLocation) {
                setCurrentLocationId(savedLocation);
            }

            setIsHydrated(true);
        }
    }, []);

    // Persist currentDate
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem("rota_currentDate", currentDate.toISOString());
        }
    }, [currentDate, isHydrated]);
    const [viewMode, setViewMode] = useState<'my_shifts' | 'team'>('team');
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);

    // Fix: Case-insensitive role check
    const isAdmin = userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'manager';

    const [locations, setLocations] = useState<{ id: string, name: string }[]>([]);
    const [currentLocationId, setCurrentLocationId] = useState<string>("");

    // Print State
    const [printMode, setPrintMode] = useState<'week' | 'month'>('week');
    const [monthWeeks, setMonthWeeks] = useState<{ start: Date, id: string, shifts: Shift[] }[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekId = format(weekStart, "yyyy-'W'ww");

    console.log("Render RotaPage:", JSON.stringify({
        weekId,
        currentLocationId,
        shiftsCount: shifts.length,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        viewMode,
        userId: userProfile?.uid
    }, null, 2));

    useEffect(() => {
        console.log("RotaPage MOUNTED");
        fetchLocations();
    }, []);

    // Persist location selection
    useEffect(() => {
        let active = true;
        if (isHydrated && currentLocationId) {
            setLoading(true);
            fetchShifts(weekId, currentLocationId).then(data => {
                if (active) {
                    setShifts(data);
                    setLoading(false);
                }
            });
        }
        return () => { active = false; };
    }, [weekId, currentLocationId, isHydrated]);

    // Sync selected date when week changes
    useEffect(() => {
        if (selectedDate < weekStart || selectedDate > weekEnd) {
            setSelectedDate(weekStart);
        }
    }, [weekStart]);

    async function fetchLocations() {
        try {
            const snapshot = await getDocs(collection(db, "locations"));
            const locs = snapshot.docs.map(doc => {
                const data = doc.data();
                let name = data.name;
                if (!name) {
                    name = doc.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
                return { id: doc.id, name };
            });
            console.log("Fetched locations:", locs);
            setLocations(locs);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    }

    async function fetchShifts(targetWeekId: string, targetLocationId: string) {
        try {
            const q = query(
                collection(db, "shifts"),
                where("weekId", "==", targetWeekId),
                where("locationId", "==", targetLocationId)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    startTime: parseDate(d.startTime),
                    endTime: parseDate(d.endTime)
                };
            }) as Shift[];
            console.log(`Fetched ${data.length} shifts for ${targetLocationId}`);
            return data;
        } catch (error) {
            console.error("Error fetching shifts:", error);
            return [];
        }
    }

    async function handleDeleteShift(shiftId: string) {
        if (!confirm("Are you sure you want to delete this shift?")) return;
        try {
            await deleteDoc(doc(db, "shifts", shiftId));
            const data = await fetchShifts(weekId, currentLocationId);
            setShifts(data);
        } catch (error) {
            console.error("Error deleting shift:", error);
            alert("Failed to delete shift.");
        }
    }

    function handleEditShift(shift: Shift) {
        setShiftToEdit(shift);
        setIsDrawerOpen(true);
    }

    function handleAddShift() {
        setShiftToEdit(null);
        setIsDrawerOpen(true);
    }

    async function handlePublishWeek() {
        if (!confirm("Are you sure you want to publish all shifts for this week? Staff will be notified.")) return;

        setPublishing(true);
        try {
            const batch = writeBatch(db);
            const unpublishedShifts = shifts.filter(s => !s.published);

            if (unpublishedShifts.length === 0) {
                alert("All shifts are already published.");
                return;
            }

            unpublishedShifts.forEach(shift => {
                const shiftRef = doc(db, "shifts", shift.id);
                batch.update(shiftRef, { published: true });
            });

            await batch.commit();
            const data = await fetchShifts(weekId, currentLocationId); // Refresh
            setShifts(data);
        } catch (error) {
            console.error("Error publishing week:", error);
            alert("Failed to publish shifts.");
        } finally {
            setPublishing(false);
        }
    }

    const handlePrevWeek = () => setCurrentDate(prev => addDays(prev, -7));
    const handleNextWeek = () => setCurrentDate(prev => addDays(prev, 7));

    async function handlePrintMonth() {
        if (!currentLocationId) return;
        setIsPrinting(true);
        setPrintMode('month');

        try {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);

            // Get all weeks that overlap with this month
            const weeks = eachWeekOfInterval({
                start: monthStart,
                end: monthEnd
            }, { weekStartsOn: 1 });

            const weeksData = await Promise.all(weeks.map(async (start) => {
                const wId = format(start, "yyyy-'W'ww");
                const shiftsData = await fetchShifts(wId, currentLocationId);
                return {
                    start,
                    id: wId,
                    shifts: shiftsData
                };
            }));

            setMonthWeeks(weeksData);

            // Allow state to update and render before printing
            setTimeout(() => {
                window.print();
                setIsPrinting(false);
                // Optional: Reset to week mode after print? 
                // setPrintMode('week'); 
            }, 500);

        } catch (error) {
            console.error("Error preparing month print:", error);
            setIsPrinting(false);
            setPrintMode('week');
        }
    }

    // Filter shifts based on view mode
    const filteredShifts = viewMode === 'my_shifts'
        ? shifts.filter(s => s.staffId === userProfile?.uid)
        : shifts;

    // Group shifts by day
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Mobile: Get shifts for selected date
    const selectedDayShifts = filteredShifts.filter(s => {
        const match = isSameDay(s.startTime, selectedDate);
        console.log(`Filter Check: Shift ${s.id} (${format(s.startTime, 'yyyy-MM-dd')}) vs Selected (${format(selectedDate, 'yyyy-MM-dd')}) = ${match}`);
        return match;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    console.log("Selected Day Shifts:", selectedDayShifts.length);

    return (
        <AppShell>
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Rota</h1>
                        <p className="text-text-muted font-medium font-oswald uppercase tracking-wide text-sm">
                            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between md:justify-end gap-4">
                        {/* Location Selector (Admin Only) */}
                        {isAdmin && (
                            <div className="w-full md:w-48">
                                <Select value={currentLocationId} onValueChange={setCurrentLocationId}>
                                    <SelectTrigger className="h-10 bg-white border-border">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-brand-red" />
                                            <SelectValue placeholder="Select Store" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id} className="cursor-pointer font-medium">
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {/* View Toggle */}
                        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('team')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                                    viewMode === 'team' ? "bg-brand-dark text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                Team
                            </button>
                            <button
                                onClick={() => setViewMode('my_shifts')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                                    viewMode === 'my_shifts' ? "bg-brand-red text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                My Shifts
                            </button>
                        </div>

                        {isAdmin && (
                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="flex">
                                            <Printer className="mr-2 h-4 w-4" /> Print / PDF
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setPrintMode('week'); setTimeout(() => window.print(), 500); }}>
                                            Print Current Week
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handlePrintMonth}>
                                            Print Current Month
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline" size="sm" className="hidden md:flex">
                                    <Copy className="mr-2 h-4 w-4" /> Copy Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
                                    onClick={handlePublishWeek}
                                    disabled={publishing || shifts.every(s => s.published)}
                                >
                                    {publishing ? "Publishing..." : "Publish Week"}
                                </Button>
                                <Button onClick={handleAddShift} className="bg-brand-dark text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Add Shift
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Print Header (Visible only in print - Week View Only) */}
                {printMode === 'week' && (
                    <div className="hidden print:block mb-2 text-center">
                        <h1 className="font-fraunces text-2xl font-black text-brand-dark mb-0.5">FRIEZ 'N' BURGZ</h1>
                        <div className="flex items-center justify-center gap-2 text-sm font-oswald uppercase tracking-wide border-b border-brand-dark pb-1">
                            <span>{locations.find(l => l.id === currentLocationId)?.name || 'All Locations'}</span>
                            <span className="text-brand-red">•</span>
                            <span>{format(weekStart, "MMMM d")} - {format(weekEnd, "MMMM d, yyyy")}</span>
                        </div>
                    </div>
                )}

                {/* Week Navigation */}
                <div className="flex items-center justify-between bg-surface p-2 rounded-xl border border-border shadow-sm print:hidden">
                    <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="hover:bg-surface-hover">
                        <ChevronLeft className="h-5 w-5 text-brand-dark" />
                    </Button>
                    <span className="font-fraunces font-bold text-lg text-brand-dark">
                        Week {format(weekStart, "w")}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextWeek} className="hover:bg-surface-hover">
                        <ChevronRight className="h-5 w-5 text-brand-dark" />
                    </Button>
                </div>

                {/* Mobile Date Strip (Visible on small screens) */}
                <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide print:hidden">
                    <div className="flex gap-2 min-w-max">
                        {days.map(day => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const hasShifts = filteredShifts.some(s => isSameDay(s.startTime, day));

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-14 h-20 rounded-xl border transition-all duration-200",
                                        isSelected
                                            ? "bg-brand-dark border-brand-dark text-white shadow-lg scale-105"
                                            : "bg-surface border-border text-text-secondary hover:border-brand-khaki",
                                        isTodayDate && !isSelected && "border-brand-khaki border-2"
                                    )}
                                >
                                    <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                                        {format(day, "EEE")}
                                    </span>
                                    <span className={cn(
                                        "text-xl font-black font-fraunces mt-1",
                                        isSelected ? "text-white" : "text-brand-dark"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                    {hasShifts && (
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-2",
                                            isSelected ? "bg-brand-khaki" : "bg-brand-red"
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Day View Content */}
                <div className="md:hidden space-y-4 print:hidden">
                    <div className="flex items-center justify-between">
                        <h2 className="font-fraunces text-xl font-bold text-brand-dark">
                            {format(selectedDate, "EEEE, MMMM d")}
                        </h2>
                        <span className="text-xs font-medium text-text-muted bg-surface px-2 py-1 rounded-md border border-border">
                            {selectedDayShifts.length} Shift{selectedDayShifts.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {selectedDayShifts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-surface rounded-xl border border-border border-dashed">
                            <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-3">
                                <CalendarIcon className="h-6 w-6 text-text-muted" />
                            </div>
                            <p className="text-brand-dark font-medium">No shifts scheduled</p>
                            <p className="text-text-muted text-sm mt-1">Enjoy your day off!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedDayShifts.map(shift => (
                                <ShiftCard
                                    key={shift.id}
                                    shift={shift}
                                    isAdmin={isAdmin}
                                    onEdit={handleEditShift}
                                    onDelete={handleDeleteShift}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop Week Grid (Visible on medium+ screens) */}
                <div className={cn("hidden md:block print:block", printMode === 'month' ? 'print:hidden' : '')}>
                    <WeekGrid
                        weekStart={weekStart}
                        shifts={filteredShifts}
                        isAdmin={isAdmin}
                        onEdit={handleEditShift}
                        onDelete={handleDeleteShift}
                    />
                </div>

                {/* Month Print View (Visible only in print when mode is month) */}
                {printMode === 'month' && (
                    <div className="hidden print:block">
                        {/* Chunk weeks into groups of 3 for pagination */}
                        {Array.from({ length: Math.ceil(monthWeeks.length / 3) }).map((_, pageIndex) => {
                            const pageWeeks = monthWeeks.slice(pageIndex * 3, (pageIndex + 1) * 3);
                            return (
                                <div key={pageIndex} className={cn(
                                    "flex flex-col min-h-screen",
                                    pageIndex < Math.ceil(monthWeeks.length / 3) - 1 ? "break-after-page" : ""
                                )}>
                                    {/* Repeated Header for each page */}
                                    <div className="mb-4 text-center">
                                        <h1 className="font-fraunces text-2xl font-black text-brand-dark mb-0.5">FRIEZ 'N' BURGZ</h1>
                                        <div className="flex items-center justify-center gap-2 text-sm font-oswald uppercase tracking-wide border-b border-brand-dark pb-1">
                                            <span>{locations.find(l => l.id === currentLocationId)?.name || 'All Locations'}</span>
                                            <span className="text-brand-red">•</span>
                                            <span>{format(currentDate, "MMMM yyyy")}</span>
                                            <span className="text-text-muted ml-2">(Page {pageIndex + 1})</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-grow">
                                        {pageWeeks.map((week) => (
                                            <div key={week.id} className="break-inside-avoid">
                                                <h3 className="font-oswald text-xs text-text-muted uppercase tracking-wider mb-0.5">
                                                    Week of {format(week.start, "MMM d")}
                                                </h3>
                                                <WeekGrid
                                                    weekStart={week.start}
                                                    shifts={week.shifts}
                                                    isAdmin={isAdmin}
                                                    onEdit={() => { }}
                                                    onDelete={() => { }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Floating Action Button for Mobile Admin */}
                {isAdmin && (
                    <Button
                        onClick={handleAddShift}
                        size="icon"
                        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-brand-red hover:bg-brand-red/90 text-white md:hidden z-30"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                )}
            </div>

            <AddShiftDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                weekId={weekId}
                locationId={currentLocationId}
                onShiftAdded={async () => {
                    const data = await fetchShifts(weekId, currentLocationId);
                    setShifts(data);
                }}
                shiftToEdit={shiftToEdit}
            />
        </AppShell>
    );
}
