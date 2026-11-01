import {
  Baby,
  Droplets,
  Heart,
  Pill,
  Sparkles,
  Sun,
} from "lucide-react"
import Link from "next/link"

import type { CategoryChip } from "@/lib/presentation/demo-catalog"
import { cn } from "@/lib/utils"

const icons = {
  sparkles: Sparkles,
  droplet: Droplets,
  heart: Heart,
  pill: Pill,
  baby: Baby,
  sun: Sun,
} as const

export function CategoryRow({ categories }: { categories: CategoryChip[] }) {
  return (
    <nav aria-label="Κατηγορίες" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-3 pb-1">
        {categories.map((category) => {
          const Icon = icons[category.icon]
          return (
            <li key={category.label}>
              <Link
                href={category.href}
                className={cn(
                  "flex w-[4.75rem] flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center",
                  "min-h-0 transition-colors hover:border-primary/40 hover:bg-accent"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-[0.7rem] font-semibold leading-tight text-foreground">
                  {category.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
