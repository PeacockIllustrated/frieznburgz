"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { locations } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import {
    AlertTriangle,
    Search,
    Printer,
    FileText,
    ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// The 14 Major Allergens
const ALLERGENS = [
    "Celery", "Cereals containing Gluten", "Crustaceans", "Eggs", "Fish",
    "Lupin", "Milk", "Molluscs", "Mustard", "Nuts",
    "Peanuts", "Sesame Seeds", "Soya", "Sulphur Dioxide"
];

interface MenuItem {
    id: string;
    name: string;
    category: string;
    allergens: Record<string, 'contains' | 'may_contain' | 'free' | 'unknown'>;
    notes?: string;
}

interface Incident {
    id: string;
    storeName: string;
    customerAllergies: string[];
    itemOrdered: string;
    outcome: string;
    timestamp: any;
}

export default function AllergensPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Incident Modal
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [incidentForm, setIncidentForm] = useState({
        storeId: locations[0].id,
        customerAllergies: [] as string[],
        itemOrdered: "",
        actionTaken: "",
        outcome: "served_safely",
        notes: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "menuItems"));
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
            setMenuItems(items.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error fetching menu items:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleLogIncident = async () => {
        if (!incidentForm.itemOrdered || incidentForm.customerAllergies.length === 0) {
            alert("Please fill in required fields.");
            return;
        }

        try {
            const storeName = locations.find(l => l.id === incidentForm.storeId)?.name || "Unknown Store";

            await addDoc(collection(db, "allergyIncidents"), {
                ...incidentForm,
                storeName,
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser?.uid || "anonymous",
                createdByName: auth.currentUser?.email || "anonymous"
            });

            alert("Incident logged successfully.");
            setIsIncidentModalOpen(false);
            setIncidentForm({
                storeId: locations[0].id,
                customerAllergies: [],
                itemOrdered: "",
                actionTaken: "",
                outcome: "served_safely",
                notes: ""
            });
        } catch (error) {
            console.error("Error logging incident:", error);
            alert("Failed to log incident.");
        }
    };

    const toggleIncidentAllergen = (allergen: string) => {
        setIncidentForm(prev => {
            const current = prev.customerAllergies;
            if (current.includes(allergen)) {
                return { ...prev, customerAllergies: current.filter(a => a !== allergen) };
            } else {
                return { ...prev, customerAllergies: [...current, allergen] };
            }
        });
    };

    const seedMenuData = async () => {
        if (!confirm("Seed default menu items?")) return;
        const defaultItems = [
            {
                name: "Beef Burgz",
                category: "Burgers",
                allergens: { "Cereals containing Gluten": "contains", "Eggs": "contains", "Mustard": "contains" }
            },
            {
                name: "Chicken Burgz",
                category: "Burgers",
                allergens: { "Cereals containing Gluten": "contains", "Eggs": "contains", "Milk": "contains" }
            },
            {
                name: "Friez",
                category: "Sides",
                allergens: { "Cereals containing Gluten": "free" } // Cooked in separate fryer
            }
        ];

        try {
            for (const item of defaultItems) {
                await addDoc(collection(db, "menuItems"), item);
            }
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Allergen Matrix</h1>
                        <p className="text-text-muted font-medium">Live allergen information and incident logging.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" /> Print Matrix
                        </Button>
                        <Button
                            className="bg-brand-red text-white font-oswald uppercase tracking-wide"
                            onClick={() => setIsIncidentModalOpen(true)}
                        >
                            <ShieldAlert className="mr-2 h-4 w-4" /> Log Incident
                        </Button>
                        {/* Admin Seed Button */}
                        <Button variant="ghost" size="icon" onClick={seedMenuData} className="opacity-20 hover:opacity-100">
                            <FileText className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <Input
                        placeholder="Search menu items..."
                        className="pl-9 bg-surface"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-brand-dark text-white font-oswald uppercase tracking-wider">
                            <tr>
                                <th className="p-4 min-w-[150px]">Menu Item</th>
                                {ALLERGENS.map(allergen => (
                                    <th key={allergen} className="p-2 text-center min-w-[80px] text-[10px] rotate-180 writing-mode-vertical">
                                        <div className="rotate-180">{allergen}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={15} className="p-8 text-center">Loading matrix...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={15} className="p-8 text-center">No items found.</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                        <td className="p-4 font-bold text-brand-dark">{item.name}</td>
                                        {ALLERGENS.map(allergen => {
                                            const status = item.allergens?.[allergen] || 'free';
                                            return (
                                                <td key={allergen} className="p-2 text-center border-l border-border/50">
                                                    {status === 'contains' && (
                                                        <div className="mx-auto h-4 w-4 rounded-full bg-brand-red" title="Contains" />
                                                    )}
                                                    {status === 'may_contain' && (
                                                        <div className="mx-auto h-4 w-4 rounded-full bg-brand-khaki" title="May Contain" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="flex gap-6 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-brand-red" />
                        <span>Contains Allergen</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-brand-khaki" />
                        <span>May Contain (Cross-contamination risk)</span>
                    </div>
                </div>

                {/* Incident Modal */}
                <Dialog open={isIncidentModalOpen} onOpenChange={setIsIncidentModalOpen}>
                    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-fraunces text-2xl">Log Allergy Incident</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Store Location</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                                    value={incidentForm.storeId}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, storeId: e.target.value })}
                                >
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Customer Allergies</Label>
                                <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                    {ALLERGENS.map(allergen => (
                                        <label key={allergen} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={incidentForm.customerAllergies.includes(allergen)}
                                                onChange={() => toggleIncidentAllergen(allergen)}
                                                className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
                                            />
                                            {allergen}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Item Ordered / Discussed</Label>
                                <Input
                                    value={incidentForm.itemOrdered}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, itemOrdered: e.target.value })}
                                    placeholder="e.g. Beef Burgz (No Bun)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Action Taken</Label>
                                <Textarea
                                    value={incidentForm.actionTaken}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, actionTaken: e.target.value })}
                                    placeholder="Checked matrix, informed customer, alerted kitchen..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Outcome</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                                    value={incidentForm.outcome}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, outcome: e.target.value })}
                                >
                                    <option value="served_safely">Served Safely</option>
                                    <option value="refused">Refused Service (Too High Risk)</option>
                                    <option value="escalated">Escalated to Manager</option>
                                </select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsIncidentModalOpen(false)}>Cancel</Button>
                            <Button className="bg-brand-red text-white" onClick={handleLogIncident}>
                                Submit Log
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}
