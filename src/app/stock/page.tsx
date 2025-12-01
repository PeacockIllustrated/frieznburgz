"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { locations, getLocationDisplayName } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "@/components/layout/AppShell";
import {
    Package,
    Save,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Plus,
    Minus,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StockItem {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    reorderPoint?: number;
    reorderQuantity?: number;
}

interface PendingChange {
    itemId: string;
    oldStock: number;
    newStock: number;
}

export default function StockPage() {
    const [selectedLocation, setSelectedLocation] = useState(locations[0].id);
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);

    // Fetch items when location changes
    useEffect(() => {
        async function fetchItems() {
            setLoading(true);
            setPendingChanges({}); // Clear pending changes on location switch
            try {
                const itemsRef = collection(db, "locations", selectedLocation, "items");
                const snapshot = await getDocs(itemsRef);
                const fetchedItems = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as StockItem[];

                // Sort by name
                fetchedItems.sort((a, b) => a.name.localeCompare(b.name));
                setItems(fetchedItems);

                // Expand all categories by default
                const categories = Array.from(new Set(fetchedItems.map(i => i.category || 'Uncategorized')));
                const initialExpanded = categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
                setExpandedCategories(initialExpanded);

            } catch (error) {
                console.error("Error fetching stock:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchItems();
    }, [selectedLocation]);

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    // Filter categories based on search
    const filteredCategories = Object.keys(groupedItems).filter(category => {
        if (!searchTerm) return true;
        // Check if category matches or any item in category matches
        const categoryMatch = category.toLowerCase().includes(searchTerm.toLowerCase());
        const itemMatch = groupedItems[category].some(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return categoryMatch || itemMatch;
    }).sort();

    const handleStockChange = (itemId: string, newValue: number) => {
        if (newValue < 0) return;

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const originalStock = item.currentStock;

        if (newValue === originalStock) {
            // Remove from pending changes if value matches original
            const newPending = { ...pendingChanges };
            delete newPending[itemId];
            setPendingChanges(newPending);
        } else {
            // Add/Update pending change
            setPendingChanges(prev => ({
                ...prev,
                [itemId]: {
                    itemId,
                    oldStock: originalStock,
                    newStock: newValue
                }
            }));
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const changes = Object.values(pendingChanges);

            if (changes.length === 0) return;

            // 1. Update Items
            changes.forEach(change => {
                const itemRef = doc(db, "locations", selectedLocation, "items", change.itemId);
                batch.update(itemRef, { currentStock: change.newStock });
            });

            // 2. Create Log Entries (Batching logs might hit limits if too many, but usually fine)
            // For a robust system, we might want to group these or use a cloud function, 
            // but direct write is fine for now.
            const logBatch = writeBatch(db); // Separate batch for logs if needed, but we can combine if < 500 ops

            // Let's just use one batch for now, assuming < 250 changed items
            changes.forEach(change => {
                const item = items.find(i => i.id === change.itemId);
                const logRef = doc(collection(db, "locations", selectedLocation, "stock_log"));
                batch.set(logRef, {
                    itemId: change.itemId,
                    itemName: item?.name || 'Unknown',
                    oldStock: change.oldStock,
                    newStock: change.newStock,
                    changeAmount: change.newStock - change.oldStock,
                    unit: item?.unit || 'units',
                    updatedBy: auth.currentUser?.email || 'Unknown',
                    timestamp: serverTimestamp(),
                    transactionGroupId: `txn_${Date.now()}` // Simple grouping
                });
            });

            await batch.commit();

            // Update local state
            setItems(prev => prev.map(item => {
                const change = pendingChanges[item.id];
                if (change) {
                    return { ...item, currentStock: change.newStock };
                }
                return item;
            }));

            setPendingChanges({});

        } catch (error) {
            console.error("Error saving changes:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const pendingCount = Object.keys(pendingChanges).length;

    return (
        <AppShell>
            <div className="space-y-6 pb-20">
                {/* Header & Controls */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Stock Management</h1>
                        <p className="text-text-muted font-medium">Manage inventory levels for your location.</p>
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

                {/* Search & Stats */}
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <Input
                            placeholder="Search items..."
                            className="pl-9 bg-surface"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stock List */}
                {loading ? (
                    <div className="text-center py-12 text-text-muted">Loading inventory...</div>
                ) : (
                    <div className="space-y-6">
                        {filteredCategories.map(category => {
                            const categoryItems = groupedItems[category].filter(item =>
                                !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (categoryItems.length === 0) return null;

                            const isExpanded = expandedCategories[category];

                            return (
                                <Card key={category} className="overflow-hidden border-none shadow-none bg-transparent">
                                    <div
                                        className="flex items-center gap-2 py-3 cursor-pointer group"
                                        onClick={() => toggleCategory(category)}
                                    >
                                        <div className={cn("p-1 rounded-md transition-colors group-hover:bg-surface-hover", isExpanded ? "bg-surface-hover" : "")}>
                                            {isExpanded ? <ChevronDown className="h-5 w-5 text-brand-red" /> : <ChevronRight className="h-5 w-5 text-text-muted" />}
                                        </div>
                                        <h3 className="font-fraunces font-bold text-xl text-brand-dark">{category}</h3>
                                        <Badge variant="outline" className="ml-2 font-mono text-xs">{categoryItems.length}</Badge>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-surface-hover/50">
                                                        <TableHead className="w-[40%]">Item Name</TableHead>
                                                        <TableHead className="w-[20%]">Status</TableHead>
                                                        <TableHead className="w-[40%] text-right">Current Stock</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {categoryItems.map(item => {
                                                        const pending = pendingChanges[item.id];
                                                        const displayStock = pending ? pending.newStock : item.currentStock;
                                                        const hasChanged = !!pending;
                                                        const isLowStock = item.reorderPoint !== undefined && displayStock <= item.reorderPoint;

                                                        return (
                                                            <TableRow key={item.id} className={cn(hasChanged ? "bg-brand-khaki/10" : "")}>
                                                                <TableCell>
                                                                    <div className="font-bold text-brand-dark">{item.name}</div>
                                                                    <div className="text-xs text-text-muted">{item.unit}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isLowStock && (
                                                                        <Badge variant="destructive" className="gap-1">
                                                                            <AlertCircle className="h-3 w-3" /> Low Stock
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleStockChange(item.id, displayStock - 1)}
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </Button>
                                                                        <Input
                                                                            type="number"
                                                                            className={cn(
                                                                                "w-20 text-center font-mono font-bold h-8",
                                                                                hasChanged ? "border-brand-khaki text-brand-dark bg-white" : ""
                                                                            )}
                                                                            value={displayStock}
                                                                            onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleStockChange(item.id, displayStock + 1)}
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Floating Save Bar */}
                {pendingCount > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-brand-dark text-white p-4 rounded-xl shadow-2xl flex items-center justify-between border border-brand-grey z-50 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-khaki text-brand-dark h-8 w-8 rounded-full flex items-center justify-center font-bold font-mono">
                                {pendingCount}
                            </div>
                            <span className="font-medium">Unsaved changes</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="text-white hover:text-white hover:bg-white/10"
                                onClick={() => setPendingChanges({})}
                            >
                                Discard
                            </Button>
                            <Button
                                onClick={saveChanges}
                                disabled={saving}
                                className="bg-brand-red hover:bg-brand-red/90 text-white border-none shadow-lg"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
