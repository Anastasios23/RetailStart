"use client"

import { startTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CategoriesError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  useEffect(() => {
    console.error("Storefront category route failed", { errorName: error.name, digest: error.digest })
  }, [error])

  return (
    <main className="page-shell error-state" role="alert">
      <p className="eyebrow">Catalog unavailable</p>
      <h1>We could not load the category catalog.</h1>
      <p className="lede">Please try again in a moment.</p>
      <div className="action-row">
        <button className="button-link button-link--secondary" onClick={() => {
          startTransition(() => {
            router.refresh()
            reset()
          })
        }} type="button">Try again</button>
        <Link className="text-link" href="/">Return home</Link>
      </div>
    </main>
  )
}
