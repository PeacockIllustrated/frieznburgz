"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { locations } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import {
    Truck,
    Plus,
    Search,
    Mail,
    Phone,
    MapPin,
    Edit2,
    Trash2,
    CheckSquare,
    Square
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address?: string;
    notes?: string;
    itemsSupplied: string[]; // Array of item names
}

interface StockItem {
    id: string;
    name: string;
    category: string;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allItems, setAllItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({
        itemsSupplied: []
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            // 1. Fetch Suppliers
            const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
            const suppliersData = suppliersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Supplier[];
            suppliersData.sort((a, b) => a.name.localeCompare(b.name));
            setSuppliers(suppliersData);

            // 2. Fetch All Unique Items (for "Items Supplied" selection)
            const uniqueItemsMap = new Map<string, StockItem>();
            for (const loc of locations) {
                const itemsSnapshot = await getDocs(collection(db, "locations", loc.id, "items"));
                itemsSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!uniqueItemsMap.has(data.name)) {
                        uniqueItemsMap.set(data.name, {
                            id: doc.id, // Just need one ID reference
                            name: data.name,
                            category: data.category || 'Uncategorized'
                        });
                    }
                });
            }
            const uniqueItems = Array.from(uniqueItemsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setAllItems(uniqueItems);

        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({ ...supplier });
        } else {
            setEditingSupplier(null);
            setFormData({ itemsSupplied: [] });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email) return;
        setSubmitting(true);
        try {
            const supplierData = {
                name: formData.name,
                contactPerson: formData.contactPerson || "",
                email: formData.email,
                phone: formData.phone || "",
                address: formData.address || "",
                notes: formData.notes || "",
                itemsSupplied: formData.itemsSupplied || []
            };

            if (editingSupplier) {
                await updateDoc(doc(db, "suppliers", editingSupplier.id), supplierData);
            } else {
                await addDoc(collection(db, "suppliers"), supplierData);
            }

            await fetchData(); // Refresh list
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving supplier:", error);
            alert("Failed to save supplier.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this supplier?")) return;
        try {
            await deleteDoc(doc(db, "suppliers", id));
            await fetchData();
        } catch (error) {
            console.error("Error deleting supplier:", error);
        }
    };

    const toggleItemSupply = (itemName: string) => {
        setFormData(prev => {
            const current = prev.itemsSupplied || [];
            if (current.includes(itemName)) {
                return { ...prev, itemsSupplied: current.filter(i => i !== itemName) };
            } else {
                return { ...prev, itemsSupplied: [...current, itemName] };
            }
        });
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group items by category for the modal
    const itemsByCategory = allItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Suppliers</h1>
                        <p className="text-text-muted font-medium">Manage your vendor relationships and product sources.</p>
                    </div>
                    <Button
                        className="bg-brand-red text-white font-oswald uppercase tracking-wide"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
                    </Button>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <Input
                        placeholder="Search suppliers..."
                        className="pl-9 bg-surface"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Suppliers Grid */}
                {loading ? (
                    <div className="text-center py-12 text-text-muted">Loading suppliers...</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredSuppliers.map(supplier => (
                            <Card key={supplier.id} className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-brand-dark">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-xl font-bold text-brand-dark">{supplier.name}</CardTitle>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-brand-dark" onClick={() => handleOpenModal(supplier)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-red-600" onClick={() => handleDelete(supplier.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-brand-red">{supplier.contactPerson}</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-text-secondary">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-text-muted" />
                                            <span className="truncate">{supplier.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-text-muted" />
                                            <span>{supplier.phone || 'N/A'}</span>
                                        </div>
                                        {supplier.address && (
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-text-muted mt-0.5" />
                                                <span className="line-clamp-2">{supplier.address}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-border">
                                        <p className="text-xs font-bold uppercase text-text-muted mb-2">Supplies</p>
                                        <div className="flex flex-wrap gap-1">
                                            {supplier.itemsSupplied?.slice(0, 5).map(item => (
                                                <Badge key={item} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                    {item}
                                                </Badge>
                                            ))}
                                            {(supplier.itemsSupplied?.length || 0) > 5 && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                                    +{supplier.itemsSupplied.length - 5} more
                                                </Badge>
                                            )}
                                            {(!supplier.itemsSupplied || supplier.itemsSupplied.length === 0) && (
                                                <span className="text-xs text-text-muted italic">No items listed</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-fraunces text-2xl">
                                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supplier Name *</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Premium Meats Ltd"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input
                                        value={formData.contactPerson || ''}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="e.g. John Smith"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email *</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="orders@supplier.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+44 123 456 789"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Textarea
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Full address..."
                                    className="h-20"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Items Supplied</Label>
                                <div className="border border-border rounded-md p-4 h-60 overflow-y-auto space-y-4 bg-surface">
                                    {Object.entries(itemsByCategory).map(([category, items]) => (
                                        <div key={category}>
                                            <h4 className="font-bold text-sm text-brand-dark mb-2 sticky top-0 bg-surface py-1">{category}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {items.map(item => {
                                                    const isChecked = (formData.itemsSupplied || []).includes(item.name);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
                                                                isChecked ? "bg-brand-red/10 text-brand-dark font-medium" : "hover:bg-surface-hover"
                                                            )}
                                                            onClick={() => toggleItemSupply(item.name)}
                                                        >
                                                            {isChecked ? <CheckSquare className="h-4 w-4 text-brand-red" /> : <Square className="h-4 w-4 text-text-muted" />}
                                                            <span>{item.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button className="bg-brand-red text-white" onClick={handleSave} disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save Supplier'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}

// Helper for cn
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
