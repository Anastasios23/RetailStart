import Link from "next/link"

export default function HomePage() {
  return (
    <main className="page-shell page-shell--home">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Retail Starter</p>
        <h1 id="home-title">A simple store, grounded in current catalog data.</h1>
        <p className="lede">
          Browse products served directly from the Medusa Store API.
        </p>
        <Link className="button-link" href="/products">
          Browse products
        </Link>
      </section>
    </main>
  )
}
