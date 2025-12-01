"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden print:h-auto print:overflow-visible">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex flex-1 flex-col overflow-hidden print:h-auto print:overflow-visible">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 print:overflow-visible print:h-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
