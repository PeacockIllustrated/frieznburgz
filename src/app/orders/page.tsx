"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy, Timestamp, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { locations } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import {
    ShoppingBag,
    Plus,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronDown,
    Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Order {
    id: string;
    supplierId: string;
    supplierName: string;
    items: { itemId: string; itemName: string; quantity: number; unit: string }[];
    notes?: string;
    status: 'Pending' | 'Received' | 'Cancelled';
    orderedBy: string;
    timestampOrdered: Timestamp;
    timestampReceived?: Timestamp;
}

interface Supplier {
    id: string;
    name: string;
    itemsSupplied: string[];
}

interface StockItem {
    id: string;
    name: string;
    unit: string;
    category: string;
}

export default function OrdersPage() {
    const [selectedLocation, setSelectedLocation] = useState(locations[0].id);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allItems, setAllItems] = useState<StockItem[]>([]);

    // New Order Form State
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [orderItems, setOrderItems] = useState<{ itemId: string; quantity: number }[]>([{ itemId: "", quantity: 1 }]);
    const [orderNotes, setOrderNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [selectedLocation]);

    useEffect(() => {
        if (isModalOpen) {
            fetchSuppliersAndItems();
        }
    }, [isModalOpen]);

    async function fetchOrders() {
        setLoading(true);
        try {
            const ordersRef = collection(db, "locations", selectedLocation, "orders");
            const q = query(ordersRef, orderBy("timestampOrdered", "desc"));
            const snapshot = await getDocs(q);
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(ordersData);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSuppliersAndItems() {
        try {
            // Fetch Suppliers
            const suppliersSnapshot = await getDocs(collection(db, "suppliers"));
            const suppliersData = suppliersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Supplier[];
            setSuppliers(suppliersData.sort((a, b) => a.name.localeCompare(b.name)));

            // Fetch Items for this location
            const itemsSnapshot = await getDocs(collection(db, "locations", selectedLocation, "items"));
            const itemsData = itemsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as StockItem[];
            setAllItems(itemsData.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error fetching form data:", error);
        }
    }

    const handleCreateOrder = async () => {
        if (!selectedSupplierId || orderItems.some(i => !i.itemId || i.quantity < 1)) return;

        setSubmitting(true);
        try {
            const supplier = suppliers.find(s => s.id === selectedSupplierId);
            const itemsPayload = orderItems.map(i => {
                const item = allItems.find(ai => ai.id === i.itemId);
                return {
                    itemId: i.itemId,
                    itemName: item?.name || "Unknown",
                    quantity: i.quantity,
                    unit: item?.unit || "units"
                };
            });

            const orderData = {
                supplierId: selectedSupplierId,
                supplierName: supplier?.name || "Unknown",
                items: itemsPayload,
                notes: orderNotes,
                status: 'Pending',
                orderedBy: auth.currentUser?.email || 'Unknown',
                timestampOrdered: serverTimestamp(),
                locationId: selectedLocation
            };

            await addDoc(collection(db, "locations", selectedLocation, "orders"), orderData);

            setIsModalOpen(false);
            resetForm();
            fetchOrders();
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Failed to create order.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceiveOrder = async (order: Order) => {
        if (!confirm(`Mark order from ${order.supplierName} as Received? This will update stock.`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Update Order Status
            const orderRef = doc(db, "locations", selectedLocation, "orders", order.id);
            batch.update(orderRef, {
                status: 'Received',
                timestampReceived: serverTimestamp()
            });

            // 2. Update Stock Levels
            order.items.forEach(item => {
                const itemRef = doc(db, "locations", selectedLocation, "items", item.itemId);
                batch.update(itemRef, {
                    currentStock: increment(item.quantity)
                });
            });

            await batch.commit();
            fetchOrders();
        } catch (error) {
            console.error("Error receiving order:", error);
            alert("Failed to receive order.");
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        try {
            await updateDoc(doc(db, "locations", selectedLocation, "orders", orderId), {
                status: 'Cancelled'
            });
            fetchOrders();
        } catch (error) {
            console.error("Error cancelling order:", error);
        }
    };

    const resetForm = () => {
        setSelectedSupplierId("");
        setOrderItems([{ itemId: "", quantity: 1 }]);
        setOrderNotes("");
    };

    // Filter items based on selected supplier
    const availableItems = selectedSupplierId
        ? allItems.filter(item => {
            const supplier = suppliers.find(s => s.id === selectedSupplierId);
            return supplier?.itemsSupplied?.includes(item.name);
        })
        : [];

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Orders</h1>
                        <p className="text-text-muted font-medium">Track purchases and incoming deliveries.</p>
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
                        <Button
                            className="bg-brand-red text-white font-oswald uppercase tracking-wide"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> New Order
                        </Button>
                    </div>
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="text-center py-12 text-text-muted">Loading orders...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border">
                        <ShoppingBag className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-50" />
                        <h3 className="font-bold text-lg text-brand-dark">No orders found</h3>
                        <p className="text-text-muted">Create a new order to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {orders.map(order => (
                            <Card key={order.id} className={cn(
                                "border-t-4 transition-all hover:shadow-md",
                                order.status === 'Pending' ? "border-t-brand-khaki" :
                                    order.status === 'Received' ? "border-t-green-500" : "border-t-text-muted"
                            )}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold text-brand-dark">{order.supplierName}</CardTitle>
                                            <p className="text-xs text-text-muted mt-1">
                                                Ordered: {order.timestampOrdered?.toDate().toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge variant={
                                            order.status === 'Pending' ? 'secondary' :
                                                order.status === 'Received' ? 'default' : 'outline'
                                        } className={cn(
                                            order.status === 'Received' && "bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
                                        )}>
                                            {order.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-brand-dark flex justify-between">
                                            <span>Total Items:</span>
                                            <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                                        </p>
                                        <div className="text-xs text-text-secondary space-y-1">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span className="truncate max-w-[180px]">{item.itemName}</span>
                                                    <span className="font-mono">{item.quantity} {item.unit}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <p className="text-text-muted italic">+{order.items.length - 3} more items...</p>
                                            )}
                                        </div>
                                    </div>

                                    {order.status === 'Pending' && (
                                        <div className="pt-4 border-t border-border flex gap-2">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs uppercase font-bold"
                                                onClick={() => handleReceiveOrder(order)}
                                            >
                                                Receive
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleCancelOrder(order.id)}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create Order Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-fraunces text-2xl">Create New Order</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Supplier Selection */}
                            <div className="space-y-2">
                                <Label>Select Supplier</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto p-1">
                                    {suppliers.map(supplier => (
                                        <div
                                            key={supplier.id}
                                            className={cn(
                                                "border rounded-lg p-3 cursor-pointer transition-all hover:border-brand-red",
                                                selectedSupplierId === supplier.id ? "border-brand-red bg-brand-red/5 ring-1 ring-brand-red" : "border-border bg-surface"
                                            )}
                                            onClick={() => {
                                                setSelectedSupplierId(supplier.id);
                                                setOrderItems([{ itemId: "", quantity: 1 }]); // Reset items on supplier change
                                            }}
                                        >
                                            <div className="font-bold text-sm text-brand-dark">{supplier.name}</div>
                                            <div className="text-xs text-text-muted mt-1">{supplier.itemsSupplied?.length || 0} items</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Items Selection */}
                            {selectedSupplierId && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label>Order Items</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-brand-red h-8"
                                            onClick={() => setOrderItems([...orderItems, { itemId: "", quantity: 1 }])}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {orderItems.map((item, index) => (
                                            <div key={index} className="flex gap-2 items-start">
                                                <div className="flex-1">
                                                    <select
                                                        className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                                                        value={item.itemId}
                                                        onChange={(e) => {
                                                            const newItems = [...orderItems];
                                                            newItems[index].itemId = e.target.value;
                                                            setOrderItems(newItems);
                                                        }}
                                                    >
                                                        <option value="" disabled>Select Item</option>
                                                        {availableItems.map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <Input
                                                    type="number"
                                                    className="w-20"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newItems = [...orderItems];
                                                        newItems[index].quantity = parseInt(e.target.value) || 1;
                                                        setOrderItems(newItems);
                                                    }}
                                                />
                                                {orderItems.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-text-muted hover:text-red-500"
                                                        onClick={() => {
                                                            const newItems = orderItems.filter((_, i) => i !== index);
                                                            setOrderItems(newItems);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    placeholder="Delivery instructions..."
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button
                                className="bg-brand-red text-white"
                                onClick={handleCreateOrder}
                                disabled={submitting || !selectedSupplierId}
                            >
                                {submitting ? 'Creating...' : 'Create Order'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}
