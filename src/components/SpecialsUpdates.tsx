"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, updateDoc, doc } from "firebase/firestore";
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
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, FileText, DollarSign, AlertCircle, Image as ImageIcon, Calendar as CalendarIcon, Edit2, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface SpecialUpdate {
    id: string;
    type: "Burger" | "Bitez" | "Milkshake";
    name: string;
    description: string;
    price: string;
    allergens: string[];
    dateOfChange?: Timestamp;
    imageUrl?: string;
    notes?: string;
    createdBy: {
        uid: string;
        name: string;
    };
    createdAt: Timestamp;
}

const ALLERGEN_OPTIONS = [
    "Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Soy", "Wheat", "Fish", "Shellfish", "Sesame", "Mustard", "Celery", "Sulphites", "Lupin", "Molluscs"
];

export function SpecialsUpdates() {
    const { user, userProfile } = useAuth();
    const [updates, setUpdates] = useState<SpecialUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [type, setType] = useState<"Burger" | "Bitez" | "Milkshake">("Burger");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [dateOfChange, setDateOfChange] = useState("");
    const [notes, setNotes] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState("");

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

    const handleEdit = (update: SpecialUpdate) => {
        setEditingId(update.id);
        setType(update.type);
        setName(update.name);
        setDescription(update.description);
        setPrice(update.price);
        setSelectedAllergens(update.allergens || []);
        setNotes(update.notes || "");
        setCurrentImageUrl(update.imageUrl || "");

        if (update.dateOfChange) {
            setDateOfChange(format(update.dateOfChange.toDate(), "yyyy-MM-dd"));
        } else {
            setDateOfChange("");
        }

        setIsSheetOpen(true);
    };

    const handleAddNew = () => {
        setEditingId(null);
        setType("Burger");
        setName("");
        setDescription("");
        setPrice("");
        setSelectedAllergens([]);
        setNotes("");
        setCurrentImageUrl("");
        setDateOfChange("");
        setImageFile(null);
        setIsSheetOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile) return;

        setSubmitting(true);

        try {
            let imageUrl = currentImageUrl;

            if (imageFile) {
                const storageRef = ref(storage, `specials/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const updateData = {
                type,
                name,
                description,
                price,
                allergens: selectedAllergens,
                dateOfChange: dateOfChange ? Timestamp.fromDate(new Date(dateOfChange)) : null,
                notes,
                imageUrl,
                createdBy: {
                    uid: user.uid,
                    name: `${userProfile.firstName} ${userProfile.lastName}`
                },
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "specials_updates", editingId), updateData);
            } else {
                await addDoc(collection(db, "specials_updates"), {
                    ...updateData,
                    createdAt: serverTimestamp()
                });
            }

            setIsSheetOpen(false);
            handleAddNew(); // Reset form

        } catch (error) {
            console.error("Error saving special update:", error);
            alert("Failed to save update. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleAllergen = (allergen: string) => {
        setSelectedAllergens(prev =>
            prev.includes(allergen)
                ? prev.filter(a => a !== allergen)
                : [...prev, allergen]
        );
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-fraunces">Specials Updates</CardTitle>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="bg-brand-red hover:bg-brand-red/90 text-white" onClick={handleAddNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Update
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle>{editingId ? "Edit Special" : "Add New Special"}</SheetTitle>
                            <SheetDescription>
                                {editingId ? "Update the details for this special." : "Add details for a new special item."}
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
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Allergens</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            {selectedAllergens.length > 0
                                                ? `${selectedAllergens.length} selected`
                                                : "Select Allergens"}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-full max-h-[200px] overflow-y-auto">
                                        {ALLERGEN_OPTIONS.map((allergen) => (
                                            <DropdownMenuCheckboxItem
                                                key={allergen}
                                                checked={selectedAllergens.includes(allergen)}
                                                onCheckedChange={() => toggleAllergen(allergen)}
                                            >
                                                {allergen}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedAllergens.map(allergen => (
                                        <Badge key={allergen} variant="secondary" className="text-xs">
                                            {allergen}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateOfChange">Date of Change</Label>
                                <Input
                                    id="dateOfChange"
                                    type="date"
                                    value={dateOfChange}
                                    onChange={(e) => setDateOfChange(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Image</Label>
                                <div className="flex flex-col gap-2">
                                    {currentImageUrl && (
                                        <div className="relative w-full h-32 rounded-md overflow-hidden border">
                                            <img src={currentImageUrl} alt="Current" className="w-full h-full object-cover" />
                                        </div>
                                    )}
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
                                        {editingId ? "Saving..." : "Adding..."}
                                    </>
                                ) : (
                                    editingId ? "Save Changes" : "Add Special Update"
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
                            <div key={update.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors group relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleEdit(update)}
                                >
                                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                                </Button>

                                <div className="flex justify-between items-start mb-2 pr-8">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${update.type === 'Burger' ? 'bg-orange-100 text-orange-700' :
                                                    update.type === 'Bitez' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-pink-100 text-pink-700'
                                                }`}>
                                                {update.type}
                                            </span>
                                            {update.dateOfChange && (
                                                <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                                    {format(update.dateOfChange.toDate(), "MMM d")}
                                                </span>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {update.createdAt?.seconds ? format(update.createdAt.toDate(), "MMM d, h:mm a") : 'Just now'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg mt-1">{update.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        {update.price ? (
                                            <span className="font-bold text-brand-red text-lg">£{update.price}</span>
                                        ) : (
                                            <span className="font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded text-xs">TBC</span>
                                        )}
                                    </div>
                                </div>

                                {update.description ? (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{update.description}</p>
                                ) : (
                                    <p className="text-sm text-amber-500 bg-amber-50 inline-block px-2 py-0.5 rounded mb-3">Description TBC</p>
                                )}

                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {update.allergens && update.allergens.length > 0 ? (
                                        update.allergens.map(allergen => (
                                            <Badge key={allergen} variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                                                {allergen}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Allergens TBC</span>
                                    )}
                                </div>

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
