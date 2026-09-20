"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Storefront catalog route failed", {
      errorName: error.name,
      digest: error.digest,
    })
  }, [error])

  return (
    <main className="page-shell error-state" role="alert">
      <p className="eyebrow">Catalog unavailable</p>
      <h1>We could not load the products.</h1>
      <p className="lede">Please try again in a moment.</p>
      <div className="action-row">
        <button className="button-link button-link--secondary" onClick={reset} type="button">
          Try again
        </button>
        <Link className="text-link" href="/">
          Return home
        </Link>
      </div>
    </main>
  )
}
