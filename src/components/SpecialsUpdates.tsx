"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, FileText, DollarSign, AlertCircle, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface SpecialUpdate {
    id: string;
    type: "Burger" | "Bitez" | "Milkshake";
    name: string;
    description: string;
    price: string;
    allergens: string;
    imageUrl?: string;
    notes?: string;
    createdBy: {
        uid: string;
        name: string;
    };
    createdAt: Timestamp;
}

export function SpecialsUpdates() {
    const { user, userProfile } = useAuth();
    const [updates, setUpdates] = useState<SpecialUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [type, setType] = useState<"Burger" | "Bitez" | "Milkshake">("Burger");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [allergens, setAllergens] = useState("");
    const [notes, setNotes] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        const q = query(collection(db, "specials_updates"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updatesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SpecialUpdate[];
            setUpdates(updatesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile) return;

        setSubmitting(true);

        try {
            let imageUrl = "";

            if (imageFile) {
                const storageRef = ref(storage, `specials/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, "specials_updates"), {
                type,
                name,
                description,
                price,
                allergens,
                notes,
                imageUrl,
                createdBy: {
                    uid: user.uid,
                    name: `${userProfile.firstName} ${userProfile.lastName}`
                },
                createdAt: serverTimestamp()
            });

            // Reset form
            setName("");
            setDescription("");
            setPrice("");
            setAllergens("");
            setNotes("");
            setImageFile(null);
            setIsSheetOpen(false);

        } catch (error) {
            console.error("Error adding special update:", error);
            alert("Failed to add update. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-fraunces">Specials Updates</CardTitle>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="bg-brand-red hover:bg-brand-red/90 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Update
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle>Add New Special</SheetTitle>
                            <SheetDescription>
                                Add details for a new special item. This will be added to the updates list.
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={(val: any) => setType(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Burger">Burger</SelectItem>
                                        <SelectItem value="Bitez">Bitez</SelectItem>
                                        <SelectItem value="Milkshake">Milkshake</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. The Big Cheesy"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description / Ingredients</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="List ingredients and description..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price (£)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        className="pl-8"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="allergens">Allergens</Label>
                                <Input
                                    id="allergens"
                                    value={allergens}
                                    onChange={(e) => setAllergens(e.target.value)}
                                    placeholder="e.g. Dairy, Gluten, Nuts"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Image</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Internal Notes / Comments</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any extra info for the team..."
                                />
                            </div>

                            <Button type="submit" className="w-full bg-brand-red hover:bg-brand-red/90" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    "Add Special Update"
                                )}
                            </Button>
                        </form>
                    </SheetContent>
                </Sheet>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading updates...
                    </div>
                ) : updates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>No updates yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {updates.map((update) => (
                            <div key={update.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${update.type === 'Burger' ? 'bg-orange-100 text-orange-700' :
                                                    update.type === 'Bitez' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-pink-100 text-pink-700'
                                                }`}>
                                                {update.type}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {update.createdAt?.seconds ? format(update.createdAt.toDate(), "MMM d, yyyy h:mm a") : 'Just now'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg mt-1">{update.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-brand-red text-lg">£{update.price}</span>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{update.description}</p>

                                {update.allergens && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span className="font-medium">Allergens: {update.allergens}</span>
                                    </div>
                                )}

                                {update.imageUrl && (
                                    <div className="mb-3">
                                        <a href={update.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                            <ImageIcon className="h-3 w-3" />
                                            View Image
                                        </a>
                                    </div>
                                )}

                                {update.notes && (
                                    <div className="bg-muted/30 p-2 rounded text-xs text-muted-foreground italic border-l-2 border-muted-foreground/20">
                                        "{update.notes}"
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Added by <span className="font-medium text-foreground">{update.createdBy?.name || 'Unknown'}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
