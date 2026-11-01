import Link from "next/link"

import { Button } from "@/components/ui/button"

export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const separator = basePath.includes("?") ? "&" : "?"
  const href = (target: number) =>
    target === 1 ? basePath : `${basePath}${separator}page=${target}`

  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Σελιδοποίηση">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)} rel="prev">
            Προηγούμενη
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">
        Σελίδα {page} από {totalPages}
      </p>
      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)} rel="next">
            Επόμενη
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  )
}
