import Link from "next/link"

export default function ProductNotFound() {
  return (
    <main className="page-shell error-state" role="alert">
      <p className="eyebrow">Product unavailable</p>
      <h1>We could not find that product.</h1>
      <p className="lede">The product may have been unpublished or the link may be incorrect.</p>
      <Link className="button-link" href="/products">
        Back to products
      </Link>
    </main>
  )
}
