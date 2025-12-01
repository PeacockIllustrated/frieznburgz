"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Package,
    ClipboardList,
    BookOpen,
    LogOut,
    Trash2,
    Truck,
    ShieldAlert,
    CalendarClock,
    Briefcase
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

type NavItem = {
    type: 'link';
    name: string;
    href: string;
    icon: React.ElementType;
};

type NavGroup = {
    type: 'group';
    name: string;
    icon: React.ElementType;
    items: {
        name: string;
        href: string;
        icon: React.ElementType;
    }[];
};

const navStructure: (NavItem | NavGroup)[] = [
    { type: 'link', name: "Dashboard", href: "/", icon: LayoutDashboard },
    {
        type: 'group',
        name: "Operations",
        icon: Briefcase,
        items: [
            { name: "Stock Management", href: "/stock", icon: Package },
            { name: "Orders", href: "/orders", icon: ClipboardList },
            { name: "Suppliers", href: "/suppliers", icon: Truck },
            { name: "Wastage Log", href: "/wastage", icon: Trash2 },
            { name: "Allergens", href: "/allergens", icon: ShieldAlert },
        ]
    },
    {
        type: 'group',
        name: "Team & HR",
        icon: Users,
        items: [
            { name: "Rota", href: "/rota", icon: CalendarClock },
            { name: "Staff Management", href: "/staff", icon: Users },
            { name: "Training", href: "/training", icon: BookOpen },
        ]
    }
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Determine which accordion item should be open based on current path
    const defaultOpen = navStructure
        .filter(item => item.type === 'group')
        .find(group => group.items?.some(subItem => subItem.href === pathname))
        ?.name;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-surface border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center justify-center border-b border-border px-6">
                    <h1 className="font-fraunces text-2xl text-brand-red font-black tracking-tighter">
                        FRIEZ N BURGZ
                    </h1>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4">
                    <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-2">
                        {navStructure.map((item, index) => {
                            if (item.type === 'link') {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium uppercase transition-all font-oswald tracking-wide",
                                            isActive
                                                ? "bg-brand-red/10 text-brand-red border border-brand-red/20 shadow-sm"
                                                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                                        )}
                                        onClick={() => onClose()}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            }

                            if (item.type === 'group') {
                                const GroupIcon = item.icon;
                                return (
                                    <AccordionItem key={item.name} value={item.name} className="border-none">
                                        <AccordionTrigger className="px-4 py-3 text-sm font-medium uppercase font-oswald tracking-wide text-text-secondary hover:text-text-primary hover:no-underline rounded-lg hover:bg-surface-hover">
                                            <div className="flex items-center gap-3">
                                                <GroupIcon className="h-5 w-5" />
                                                {item.name}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-0">
                                            <div className="space-y-1 pl-4">
                                                {item.items?.map((subItem) => {
                                                    const SubIcon = subItem.icon;
                                                    const isSubActive = pathname === subItem.href;
                                                    return (
                                                        <Link
                                                            key={subItem.name}
                                                            href={subItem.href}
                                                            className={cn(
                                                                "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium uppercase transition-all font-oswald tracking-wide",
                                                                isSubActive
                                                                    ? "bg-brand-red/10 text-brand-red border border-brand-red/20 shadow-sm"
                                                                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                                                            )}
                                                            onClick={() => onClose()}
                                                        >
                                                            <SubIcon className="h-4 w-4" />
                                                            {subItem.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            }
                        })}
                    </Accordion>
                </nav>

                <div className="border-t border-border p-4">
                    <div className="flex items-center gap-3 px-4 py-3 text-text-primary">
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium text-text-muted uppercase tracking-wider">Signed in as</p>
                            <p className="truncate text-sm font-bold font-montserrat text-text-primary">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => auth.signOut()}
                        className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:text-brand-red hover:bg-brand-red/5 uppercase font-oswald tracking-wide transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
