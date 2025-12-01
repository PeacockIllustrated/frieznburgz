"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, orderBy, limit, where, Timestamp, doc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { locations, getLocationDisplayName } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import { Trash2, History, AlertTriangle, Plus, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WastageEntry {
    id: string;
    item: string;
    itemId?: string;
    quantity: number;
    unit: string;
    reason: string;
    timestamp: Timestamp;
    loggedBy: string;
}

interface StockItem {
    id: string;
    name: string;
    unit: string;
}

export default function WastagePage() {
    const [selectedLocation, setSelectedLocation] = useState(locations[0].id);
    const [wastageLog, setWastageLog] = useState<WastageEntry[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedItem, setSelectedItem] = useState("");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Stock Items for Dropdown
                const itemsRef = collection(db, "locations", selectedLocation, "items");
                const itemsSnapshot = await getDocs(itemsRef);
                const items = itemsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    unit: doc.data().unit || 'units'
                }));
                items.sort((a, b) => a.name.localeCompare(b.name));
                setStockItems(items);

                // 2. Fetch Recent Wastage Log
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const logRef = collection(db, "locations", selectedLocation, "wastage_log");
                const q = query(
                    logRef,
                    where("timestamp", ">=", sevenDaysAgo),
                    orderBy("timestamp", "desc"),
                    limit(20)
                );

                const logSnapshot = await getDocs(q);
                const logs = logSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as WastageEntry[];

                setWastageLog(logs);

            } catch (error) {
                console.error("Error fetching wastage data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedLocation]);

    const handleLogWaste = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !quantity || !reason) return;

        setSubmitting(true);
        try {
            const item = stockItems.find(i => i.id === selectedItem);
            if (!item) throw new Error("Item not found");

            const qtyNum = parseFloat(quantity);

            // 1. Add to Wastage Log
            await addDoc(collection(db, "locations", selectedLocation, "wastage_log"), {
                item: item.name,
                itemId: item.id,
                quantity: qtyNum,
                unit: item.unit,
                reason: reason,
                timestamp: new Date(),
                loggedBy: auth.currentUser?.email || 'Unknown'
            });

            // 2. Update Stock Level (Decrement)
            const itemRef = doc(db, "locations", selectedLocation, "items", item.id);
            await updateDoc(itemRef, {
                currentStock: increment(-qtyNum)
            });

            // Reset Form
            setSelectedItem("");
            setQuantity("");
            setReason("");
            setSearchTerm("");

            // Refresh Log
            // (For simplicity, we just re-fetch or manually prepend. Let's manually prepend for speed)
            const newEntry: WastageEntry = {
                id: "temp_" + Date.now(),
                item: item.name,
                itemId: item.id,
                quantity: qtyNum,
                unit: item.unit,
                reason: reason,
                timestamp: Timestamp.now(),
                loggedBy: auth.currentUser?.email || 'Unknown'
            };
            setWastageLog(prev => [newEntry, ...prev]);

        } catch (error) {
            console.error("Error logging waste:", error);
            alert("Failed to log waste. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = stockItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Wastage Log</h1>
                        <p className="text-text-muted font-medium">Track and monitor waste to reduce costs.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Log Waste Form */}
                    <Card className="lg:col-span-1 border-t-4 border-t-brand-red h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-brand-red" />
                                Log New Waste
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogWaste} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase text-text-muted tracking-wide">Item</label>
                                    {/* Searchable Select Mockup */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                        <Input
                                            placeholder="Search item..."
                                            className="pl-9 mb-2"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-brand-red"
                                        value={selectedItem}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                        required
                                        size={5} // Show multiple items
                                    >
                                        {filteredItems.length === 0 && <option disabled>No items found</option>}
                                        {filteredItems.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.unit})
                                            </option>
                                        ))}
                                    </select>
                                    {selectedItem && (
                                        <p className="text-xs text-brand-red font-medium">
                                            Selected: {stockItems.find(i => i.id === selectedItem)?.name}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase text-text-muted tracking-wide">Quantity</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase text-text-muted tracking-wide">Reason</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-brand-red"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Select reason</option>
                                            <option value="Expired">Expired</option>
                                            <option value="Damaged">Damaged</option>
                                            <option value="Spilled/Dropped">Spilled/Dropped</option>
                                            <option value="Incorrect Order">Incorrect Order</option>
                                            <option value="Quality Issue">Quality Issue</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-oswald uppercase tracking-wide mt-4"
                                    disabled={submitting}
                                >
                                    {submitting ? "Logging..." : "Log Waste"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Recent Log */}
                    <Card className="lg:col-span-2 border-t-4 border-t-brand-khaki">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-brand-khaki" />
                                Recent Activity (Last 7 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p className="text-text-muted">Loading logs...</p>
                            ) : wastageLog.length === 0 ? (
                                <div className="text-center py-8 text-text-muted flex flex-col items-center">
                                    <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                                    <p>No waste logged recently.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-surface-hover/50">
                                            <TableHead>Item</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Logged By</TableHead>
                                            <TableHead className="text-right">Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {wastageLog.map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="font-bold text-brand-dark">{entry.item}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">
                                                        {entry.quantity} {entry.unit}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{entry.reason}</TableCell>
                                                <TableCell className="text-xs text-text-muted">
                                                    {entry.loggedBy.split('@')[0]}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-text-muted">
                                                    {entry.timestamp.toDate().toLocaleDateString()} <br />
                                                    {entry.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
