import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "danger" | "success"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-active)] disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 shadow-sm": variant === "default",
            "border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]": variant === "outline",
            "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] text-[var(--text-secondary)]": variant === "ghost",
            "text-[var(--accent-blue)] underline-offset-4 hover:underline": variant === "link",
            "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20": variant === "danger",
            "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20": variant === "success",
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
