import type { Metadata } from "next"
import Link from "next/link"

import { listCategories } from "../../lib/medusa/categories"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Categories", description: "Browse product categories." }

export default async function CategoriesPage() {
  const categories = await listCategories()
  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  return (
    <main className="page-shell" aria-labelledby="categories-title">
      <header className="page-heading">
        <p className="eyebrow">Catalog</p>
        <h1 id="categories-title">Categories</h1>
        <p className="lede">Choose a category to browse its products.</p>
      </header>
      {categories.length === 0 ? (
        <p className="empty-state">No categories are available right now.</p>
      ) : (
        <ul className="category-list" role="list">
          {categories.map((category) => {
            const parent = category.parent_category_id
              ? categoriesById.get(category.parent_category_id)
              : undefined
            return (
              <li key={category.id}>
                <Link href={`/categories/${encodeURIComponent(category.handle)}`}>{category.name}</Link>
                {parent ? <p>Within {parent.name}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
