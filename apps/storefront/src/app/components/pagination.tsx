import Link from "next/link"

export function Pagination({ basePath, page, totalPages }: {
  basePath: string
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const separator = basePath.includes("?") ? "&" : "?"
  const href = (target: number) => (target === 1 ? basePath : `${basePath}${separator}page=${target}`)

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link className="text-link" href={href(page - 1)} rel="prev">Previous</Link> : null}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages ? <Link className="text-link" href={href(page + 1)} rel="next">Next</Link> : null}
    </nav>
  )
}
