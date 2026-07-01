import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./card"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20",
        secondary:
          "border-transparent bg-[#94a3b8]/10 text-[#94a3b8] border-[#94a3b8]/20",
        destructive:
          "border-transparent bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30",
        success:
          "border-transparent bg-[#10b981]/15 text-[#4ade80] border-[#10b981]/30",
        warning:
          "border-transparent bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
        info:
          "border-transparent bg-[#06b6d4]/15 text-[#22d3ee] border-[#06b6d4]/30",
        outline: "text-[#f0f4ff] border-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
