import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-surface text-text-primary shadow-sm hover:shadow-md transition-shadow duration-200",
                className
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: CardProps) {
    return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn("font-fraunces font-black text-2xl text-brand-red tracking-tight leading-none", className)} {...props} />
    );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn("text-sm text-text-muted", className)} {...props} />
    );
}

export function CardContent({ className, ...props }: CardProps) {
    return <div className={cn("p-6 pt-0", className)} {...props} />;
}
