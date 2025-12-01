"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md px-6 lg:hidden">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-text-primary hover:bg-surface-hover">
                    <Menu className="h-6 w-6" />
                </Button>
                <span className="font-fraunces text-xl text-brand-red font-black tracking-tighter">
                    FRIEZ N BURGZ
                </span>
            </div>
        </header>
    );
}
