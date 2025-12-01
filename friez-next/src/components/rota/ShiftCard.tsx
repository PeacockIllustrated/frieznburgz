"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, AlertCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Shift } from "@/app/rota/page";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ShiftCardProps {
    shift: Shift;
    isAdmin: boolean;
    compact?: boolean;
    onEdit?: (shift: Shift) => void;
    onDelete?: (shiftId: string) => void;
}

const roleColors: Record<string, string> = {
    "Kitchen": "bg-red-100 text-red-700 hover:bg-red-200",
    "Till": "bg-green-100 text-green-700 hover:bg-green-200",
    "Trainee": "bg-gray-100 text-gray-700 hover:bg-gray-200",
    "Maintenance": "bg-blue-100 text-blue-700 hover:bg-blue-200",
};

export function ShiftCard({ shift, isAdmin, compact, onEdit, onDelete }: ShiftCardProps) {
    const startTime = shift.startTime;
    const endTime = shift.endTime;
    const duration = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1);

    // Default color if role not found
    const roleBadgeColor = roleColors[shift.role] || "bg-gray-100 text-gray-700 hover:bg-gray-200";

    const ActionsMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-text-muted hover:text-brand-dark">
                    <MoreVertical className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(shift)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(shift.id)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (compact) {
        return (
            <div className={cn(
                "rounded-lg border p-2 text-sm transition-all hover:shadow-sm bg-white group relative",
                !shift.published && isAdmin ? "border-dashed border-gray-300 opacity-75" : "border-l-4 border-l-brand-red border-y-border border-r-border",
                "print:border print:border-gray-300 print:shadow-none print:break-inside-avoid print:mb-1"
            )}>
                <div className="flex justify-between items-center mb-1 print:flex-col print:items-start print:gap-0.5">
                    <span className="font-bold font-oswald text-brand-dark print:text-xs">
                        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                    </span>
                    <div className="flex items-center gap-1 print:hidden">
                        {!shift.published && isAdmin && (
                            <AlertCircle className="h-3 w-3 text-brand-khaki" />
                        )}
                        {isAdmin && <ActionsMenu />}
                    </div>
                </div>
                <div className="flex justify-between items-center print:flex-col print:items-start print:gap-0.5">
                    <span className="truncate font-medium text-text-primary text-xs print:text-sm print:font-bold print:overflow-visible print:whitespace-normal">
                        {shift.staffName}
                    </span>
                    <Badge variant="secondary" className={cn("text-[10px] px-1 py-0 h-5 print:h-auto print:py-0.5 print:px-1.5 print:text-[9px] print:border print:border-gray-200", roleBadgeColor)}>
                        {shift.role}
                    </Badge>
                </div>
            </div>
        );
    }

    return (
        <Card className={cn(
            "border-l-4 transition-all hover:shadow-md group relative",
            !shift.published && isAdmin ? "border-l-gray-400 opacity-80 border-dashed" : "border-l-brand-red"
        )}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-brand-red/5 text-brand-red">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-black font-fraunces text-lg text-brand-dark leading-none">
                                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                            </p>
                            <p className="text-xs text-text-muted font-medium mt-0.5">
                                {duration} hours
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!shift.published && isAdmin && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200 gap-1">
                                <AlertCircle className="h-3 w-3" /> Draft
                            </Badge>
                        )}
                        {isAdmin && <ActionsMenu />}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-surface-hover flex items-center justify-center">
                            <User className="h-3 w-3 text-text-muted" />
                        </div>
                        <span className="font-bold font-oswald text-sm text-text-primary uppercase tracking-wide">
                            {shift.staffName}
                        </span>
                    </div>

                    <Badge variant="secondary" className={cn("font-medium", roleBadgeColor)}>
                        {shift.role}
                    </Badge>
                </div>

                {shift.notes && (
                    <div className="mt-3 bg-surface-hover/50 p-2 rounded text-xs text-text-secondary italic border border-border/50">
                        "{shift.notes}"
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
