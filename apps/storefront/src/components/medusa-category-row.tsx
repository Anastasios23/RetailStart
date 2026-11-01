import type { HttpTypes } from "@medusajs/types"
import { Tag } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function MedusaCategoryRow({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  if (categories.length === 0) {
    return null
  }

  return (
    <nav aria-label="Κατηγορίες" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-3 pb-1">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/categories/${encodeURIComponent(category.handle)}`}
              className={cn(
                "flex w-[4.75rem] flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center",
                "min-h-0 transition-colors hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                <Tag className="size-5" aria-hidden="true" />
              </span>
              <span className="line-clamp-2 text-[0.7rem] font-semibold leading-tight text-foreground">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
