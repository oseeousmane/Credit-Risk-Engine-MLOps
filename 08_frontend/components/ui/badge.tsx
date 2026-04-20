import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accept" | "review" | "reject" | "stage1" | "stage2" | "stage3" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]",
    accept: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    review: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    reject: "border-rose-500/20 bg-rose-500/10 text-rose-500",
    stage1: "border-emerald-500/10 bg-emerald-500/5 text-emerald-400",
    stage2: "border-amber-500/10 bg-amber-500/5 text-amber-400",
    stage3: "border-rose-500/10 bg-rose-500/5 text-rose-400",
    outline: "text-[var(--text-primary)] border-[var(--border-subtle)]"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-active)]",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
