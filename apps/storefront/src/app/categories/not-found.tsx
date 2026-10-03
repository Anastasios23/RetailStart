import Link from "next/link"

export default function CategoryNotFound() {
  return (
    <main className="page-shell error-state" role="alert">
      <p className="eyebrow">Category unavailable</p>
      <h1>We could not find that category.</h1>
      <p className="lede">The category may no longer be available or the link may be incorrect.</p>
      <Link className="button-link" href="/categories">Back to categories</Link>
    </main>
  )
}
