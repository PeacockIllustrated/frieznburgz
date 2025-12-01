"use client";

import { format, addDays, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Shift } from "@/app/rota/page";
import { ShiftCard } from "@/components/rota/ShiftCard";

interface WeekGridProps {
    weekStart: Date;
    shifts: Shift[];
    isAdmin: boolean;
    onEdit: (shift: Shift) => void;
    onDelete: (shiftId: string) => void;
}

export function WeekGrid({ weekStart, shifts, isAdmin, onEdit, onDelete }: WeekGridProps) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="hidden md:grid print:grid grid-cols-7 gap-4 w-full">
            {days.map(day => {
                const dayShifts = shifts.filter(s =>
                    isSameDay(s.startTime, day)
                ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                const isTodayDate = isToday(day);

                return (
                    <div key={day.toISOString()} className={cn(
                        "min-h-[300px] rounded-xl border p-3 space-y-3",
                        isTodayDate ? "bg-brand-khaki/5 border-brand-khaki/50" : "bg-surface border-border",
                        "print:min-h-0 print:border-gray-300 print:break-inside-avoid print:p-1 print:space-y-1"
                    )}>
                        <div className="text-center border-b border-border/50 pb-2 print:pb-0.5 print:border-b-0">
                            <p className="text-xs font-bold uppercase text-text-muted tracking-wider print:text-[10px]">
                                {format(day, "EEE")}
                            </p>
                            <p className={cn(
                                "text-lg font-black font-fraunces",
                                isTodayDate ? "text-brand-red" : "text-brand-dark",
                                "print:text-sm"
                            )}>
                                {format(day, "d")}
                            </p>
                        </div>

                        <div className="space-y-2 print:space-y-0.5">
                            {dayShifts.map(shift => (
                                <ShiftCard
                                    key={shift.id}
                                    shift={shift}
                                    isAdmin={isAdmin}
                                    compact
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                            {dayShifts.length === 0 && (
                                <p className="text-xs text-center text-text-muted/50 py-4 italic">No shifts</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
