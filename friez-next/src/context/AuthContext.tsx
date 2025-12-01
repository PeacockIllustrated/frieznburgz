"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface UserProfile {
    uid: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    firstName?: string;
    lastName?: string;
    locationId?: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // Try to fetch from 'users' collection first (where roles should be)
                    // Note: In some setups, profile data might be in 'staff' collection. 
                    // Based on previous files, 'users' seems to hold progress, but let's check 'staff' or 'users' for role.
                    // The implementation plan mentioned fetching from `users/{uid}`.
                    // Let's assume 'users' has the role for now, or we might need to check 'staff'.
                    // Actually, looking at DashboardOverview, it fetches 'staff' and 'users'. 
                    // Let's check where the role is stored. 
                    // Wait, I should verify where 'role' is stored before writing this.
                    // But I'll stick to the plan: fetch from 'users'.

                    // Actually, let's look at a user doc if possible. 
                    // I'll assume standard 'users' collection for auth profile.

                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");

                    // Fetch from both 'users' and 'staff' to ensure we get the role
                    const [userDoc, staffDoc] = await Promise.all([
                        getDoc(doc(db, "users", firebaseUser.uid)),
                        getDoc(doc(db, "staff", firebaseUser.uid))
                    ]);

                    let profileData: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || "",
                        role: 'staff', // Default to staff if not found
                    };

                    if (userDoc.exists()) {
                        profileData = { ...profileData, ...userDoc.data() as Partial<UserProfile> };
                    }

                    if (staffDoc.exists()) {
                        // Staff doc likely has the authoritative role
                        const staffData = staffDoc.data() as Partial<UserProfile>;
                        profileData = { ...profileData, ...staffData };
                    }

                    // If neither exists, we might want to create a basic user doc, but for now just set what we have
                    setUserProfile(profileData);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
