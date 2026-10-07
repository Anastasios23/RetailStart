# ADR-0153: Storefront product listing pagination

- Status: Accepted
- Date: 2026-10-07

## Context

The product listings (`/products` and `/categories/[handle]`) read the Medusa
Store API with a fixed `limit: 100` and no `offset`, so a catalog above 100
products silently lost items. ADR-0139 leaves pagination undefined. No page
size, ordering, or invalid-page behavior had been approved.

## Decision

Paginate both product listings with Medusa `limit` and `offset`, keeping Medusa
the authority for the catalog and the total `count`.

- **Page size:** 24 products per page.
- **Pagination:** offset pagination, rendered on the server with `?page=N`
  and Previous / Next links with "Page X of Y". No client state, load-more, or
  infinite scroll.
- **Ordering:** an explicit `order` of `id` on every listing request. Medusa
  2.21.0 treats `order` as a single field name (a comma-separated `title,id`
  is not split), and `id` is unique, so paging is stable and deterministic.
  Title ordering is not used because it is not deterministic on duplicate
  titles with this Medusa version.
- **Invalid page policy:** a missing, malformed, zero, negative, or unsafe
  `page` shows page 1. The page count is `max(1, ceil(count / 24))`, so a
  valid integer page beyond it returns 404. An empty catalog or category has
  only page 1, which shows the existing empty state; its page 2 returns 404.
- **Fail closed:** a response with an invalid `count`, an `offset` that differs
  from the request, too many items, or duplicate products is a catalog error,
  not a partial page.
- **Category membership** is unchanged: a category page lists products directly
  assigned to it.

## Alternatives considered

### Load the whole catalog

This removes the visible ceiling but makes response size and latency grow with
the catalog, including variants, pricing, and inventory.

### Load more or infinite scroll

These need client state and are less compatible with the server-first
storefront boundary.

## Consequences

- Any catalog size is reachable without a hidden ceiling or large responses.
- Page URLs are shareable and work with the back button.
- Product order is stable by unique product id, not alphabetical. This
  decision does not claim that id order reflects creation time.

## Not decided by this ADR

This decision does not define sort or filter controls, a title-based ordering,
search pagination, page-size configuration, or pagination styling.
