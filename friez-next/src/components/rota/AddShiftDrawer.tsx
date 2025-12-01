"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parse } from "date-fns";
import { Loader2, User, Clock, Calendar, Briefcase, FileText, CheckCircle2, AlertCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shift } from "@/app/rota/page";

interface StaffMember {
    id: string;
    name: string;
    role?: string;
}

interface AddShiftDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    weekId: string;
    locationId: string; // Default/User's location
    onShiftAdded: () => void;
    shiftToEdit?: Shift | null;
}

const ROLES = [
    { value: "Kitchen", color: "bg-red-100 text-red-700" },
    { value: "Till", color: "bg-green-100 text-green-700" },
    { value: "Trainee", color: "bg-gray-100 text-gray-700" },
    { value: "Maintenance", color: "bg-blue-100 text-blue-700" },
];

// IDs from user's Firestore screenshot
const KNOWN_LOCATIONS = [
    { id: "byker", name: "Byker" },
    { id: "forrest_hall", name: "Forrest Hall" },
    { id: "newcastle_city_center", name: "Newcastle City Center" },
    { id: "south_shields", name: "South Shields" },
    { id: "whitley_bay", name: "Whitley Bay" },
];

export function AddShiftDrawer({ isOpen, onClose, weekId, locationId: defaultLocationId, onShiftAdded, shiftToEdit }: AddShiftDrawerProps) {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId);
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [startTime, setStartTime] = useState("11:00");
    const [endTime, setEndTime] = useState("17:00");
    const [role, setRole] = useState("Kitchen");
    const [notes, setNotes] = useState("");
    const [publishImmediately, setPublishImmediately] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchStaff();
            fetchLocations();
            setError("");

            // Load persisted location or use default
            const savedLocation = localStorage.getItem("lastSelectedLocation");
            if (savedLocation) {
                setSelectedLocationId(savedLocation);
            } else if (defaultLocationId) {
                setSelectedLocationId(defaultLocationId);
            }

            if (shiftToEdit) {
                // Populate form for editing
                const start = shiftToEdit.startTime;
                const end = shiftToEdit.endTime;

                setSelectedStaffId(shiftToEdit.staffId);
                // If editing, use the shift's actual location, not the persisted one
                if (shiftToEdit.locationId) {
                    setSelectedLocationId(shiftToEdit.locationId);
                }
                setDate(format(start, "yyyy-MM-dd"));
                setStartTime(format(start, "HH:mm"));
                setEndTime(format(end, "HH:mm"));
                setRole(shiftToEdit.role);
                setNotes(shiftToEdit.notes || "");
                setPublishImmediately(shiftToEdit.published);
            } else {
                // Reset defaults for new shift
                setSelectedStaffId("");
                setNotes("");
                setPublishImmediately(false);
                // Keep date/time as is or reset if needed
            }
        }
    }, [isOpen, shiftToEdit, defaultLocationId]);

    // Persist location selection
    useEffect(() => {
        if (selectedLocationId) {
            localStorage.setItem("lastSelectedLocation", selectedLocationId);
        }
    }, [selectedLocationId]);

    async function fetchStaff() {
        setLoading(true);
        try {
            // Fetch from 'staff' collection as it likely contains the profile details
            const snapshot = await getDocs(collection(db, "staff"));
            const staff = snapshot.docs.map(doc => {
                const data = doc.data();
                // Handle both 'name' (single field) and 'firstName'/'lastName' (split fields)
                const fullName = data.name || `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`;

                return {
                    id: doc.id,
                    name: fullName,
                    role: data.role
                };
            }) as StaffMember[];
            setStaffList(staff);
        } catch (error) {
            console.error("Error fetching staff:", error);
            setError("Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    }

    async function fetchLocations() {
        setLoadingLocations(true);
        try {
            console.log("Fetching locations...");
            const snapshot = await getDocs(collection(db, "locations"));
            console.log(`Found ${snapshot.size} locations`);
            const locs = snapshot.docs.map(doc => {
                const data = doc.data();
                // Use 'name' field if available, otherwise format the document ID
                let name = data.name;
                if (!name) {
                    // Format "newcastle_city_center" -> "Newcastle City Center"
                    name = doc.id
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                }
                return {
                    id: doc.id,
                    name: name
                };
            });
            console.log("Parsed locations:", locs);
            setLocations(locs);
        } catch (error) {
            console.error("Error fetching locations:", error);
            setError("Failed to load locations.");
        } finally {
            setLoadingLocations(false);
        }
    }

    const initializeLocations = async () => {
        setLoadingLocations(true);
        try {
            console.log("Initializing known locations...");
            await Promise.all(KNOWN_LOCATIONS.map(loc =>
                setDoc(doc(db, "locations", loc.id), { name: loc.name }, { merge: true })
            ));
            console.log("Locations initialized. Refreshing...");
            await fetchLocations();
        } catch (error) {
            console.error("Error initializing locations:", error);
            setError("Failed to initialize locations.");
            setLoadingLocations(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const staffMember = staffList.find(s => s.id === selectedStaffId);
            if (!staffMember) throw new Error("Please select a staff member.");

            if (!selectedLocationId) throw new Error("Please select a location.");

            const startDateTime = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
            const endDateTime = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());

            if (endDateTime <= startDateTime) {
                throw new Error("End time must be after start time.");
            }

            const shiftData = {
                staffId: selectedStaffId,
                staffName: staffMember.name,
                role: role,
                locationId: selectedLocationId,
                startTime: Timestamp.fromDate(startDateTime),
                endTime: Timestamp.fromDate(endDateTime),
                weekId: weekId,
                published: publishImmediately,
                notes: notes
            };

            if (shiftToEdit) {
                await updateDoc(doc(db, "shifts", shiftToEdit.id), shiftData);
            } else {
                await addDoc(collection(db, "shifts"), shiftData);
            }

            onShiftAdded();
            onClose();

            if (!shiftToEdit) {
                setNotes("");
                setPublishImmediately(false);
            }
        } catch (error: any) {
            console.error("Error saving shift:", error);
            setError(error.message || "Failed to save shift. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-surface">
                <SheetHeader className="px-6 py-4 border-b border-border bg-surface-hover/30">
                    <SheetTitle className="font-fraunces text-2xl text-brand-dark flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-brand-red" />
                        {shiftToEdit ? "Edit Shift" : "New Shift"}
                    </SheetTitle>
                    <SheetDescription className="text-text-muted">
                        {shiftToEdit ? "Update shift details" : `Schedule a shift for the week of ${weekId}`}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <form id="add-shift-form" onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        {/* Location Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Location
                            </Label>
                            <Select value={selectedLocationId} onValueChange={setSelectedLocationId} required>
                                <SelectTrigger className="h-12 bg-white border-border focus:ring-brand-red/20">
                                    <SelectValue placeholder="Select location..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingLocations ? (
                                        <div className="p-4 text-center text-sm text-text-muted flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
                                        </div>
                                    ) : locations.length === 0 ? (
                                        <div className="p-4 text-center space-y-3">
                                            <p className="text-sm text-text-muted">No locations found.</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={initializeLocations}
                                                className="w-full text-xs"
                                            >
                                                Initialize Defaults
                                            </Button>
                                        </div>
                                    ) : (
                                        locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id} className="cursor-pointer font-medium">
                                                {loc.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Staff Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="staff" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                <User className="h-3 w-3" /> Staff Member
                            </Label>
                            <Select value={selectedStaffId} onValueChange={setSelectedStaffId} required>
                                <SelectTrigger className="h-12 bg-white border-border focus:ring-brand-red/20">
                                    <SelectValue placeholder="Select staff member..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loading ? (
                                        <div className="p-4 text-center text-sm text-text-muted flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading staff...
                                        </div>
                                    ) : (
                                        staffList.map(staff => (
                                            <SelectItem key={staff.id} value={staff.id} className="cursor-pointer">
                                                <div className="flex flex-col text-left">
                                                    <span className="font-medium text-brand-dark">{staff.name}</span>
                                                    <span className="text-xs text-text-muted capitalize">{staff.role || 'Staff'}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="h-12 bg-white border-border focus:ring-brand-red/20 font-medium"
                            />
                        </div>

                        {/* Time Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <Label htmlFor="start" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> Start
                                </Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="h-12 bg-white border-border focus:ring-brand-red/20 font-medium text-center"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="end" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> End
                                </Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    className="h-12 bg-white border-border focus:ring-brand-red/20 font-medium text-center"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                <Briefcase className="h-3 w-3" /> Shift Role
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLES.map((r) => (
                                    <div
                                        key={r.value}
                                        onClick={() => setRole(r.value)}
                                        className={cn(
                                            "cursor-pointer rounded-lg border p-3 text-center transition-all",
                                            role === r.value
                                                ? `border-transparent ring-2 ring-brand-dark ${r.color}`
                                                : "border-border bg-white hover:bg-surface-hover text-text-secondary"
                                        )}
                                    >
                                        <span className="text-sm font-bold">{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-3">
                            <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Notes
                            </Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Opening duties, training shift..."
                                className="h-12 bg-white border-border focus:ring-brand-red/20"
                            />
                        </div>

                        {/* Publish Toggle */}
                        <div
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                                publishImmediately
                                    ? "bg-brand-khaki/10 border-brand-khaki"
                                    : "bg-surface border-border hover:border-brand-khaki/50"
                            )}
                            onClick={() => setPublishImmediately(!publishImmediately)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                                    publishImmediately ? "bg-brand-khaki border-brand-khaki text-white" : "border-text-muted bg-white"
                                )}>
                                    {publishImmediately && <CheckCircle2 className="h-3.5 w-3.5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-brand-dark">Publish Immediately</p>
                                    <p className="text-xs text-text-muted">Staff will see this shift instantly</p>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <SheetFooter className="p-6 border-t border-border bg-surface mt-auto">
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 font-oswald uppercase tracking-wide">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="add-shift-form"
                            className="flex-1 h-12 bg-brand-red hover:bg-brand-red/90 text-white font-oswald uppercase tracking-wide shadow-lg shadow-brand-red/20"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                shiftToEdit ? "Update Shift" : "Create Shift"
                            )}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
