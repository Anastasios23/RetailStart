# Katerina Kayia — Cyprus shipping & pickup design

**Status:** Validated (brainstorm + grill), 2026-10-28  
**Client:** Φαρμακείο Κατερίνα Καγιά (Latsia)  
**Scope:** Owned-store checkout fulfillment methods; Wolt remains a separate channel.

Related: `CONTEXT.md` (basic shipping + local pickup), ADR-0011, ADR-0137, ADR-0138 (no live courier/Wolt rate APIs), `docs/clients/katerina-kayia-pharmacy.md`.

---

## Understanding summary

- Owned e-shop offers **pickup at the pharmacy** and **Cyprus delivery** options with UX patterns inspired by Wolt (clear method choice, static time estimates, hours/cutoff messaging) — **not** Wolt branding, API, scheduled slots, or live tracking.
- Shoppers order guest checkout (Stripe); the pharmacy fulfills manually in Medusa Admin.
- V1 stays on **configured fixed Medusa shipping** — no ACS/Wolt/courier APIs.

## Assumptions

- Low SMB volume; pharmacy or their chosen courier executes local delivery offline.
- Local same-day copy uses a **13:00 Cyprus** cutoff (confirm with client before launch).
- “Greater Nicosia” postal-code list for local delivery is **TBD** before launch; UI assumes a zone.
- Free shipping ≥ €40 applies to paid methods (local / ACS point / door); pickup always €0.
- “Ready for pickup” email depends on P0 real transactional email; until then Admin + phone.

## Explicit non-goals

- Wolt Drive / Wolt API in checkout  
- Live maps, minute-level ETAs, scheduled time slots  
- ACS locker/point API or automated labels/tracking  
- Cash on delivery on the owned site  
- Replacing the pharmacy’s Wolt venue as a channel  

---

## Decision log

| # | Decision | Alternatives | Why |
| --- | --- | --- | --- |
| 1 | Wolt-like UX; manual Admin; no Wolt API | Own-site courier-only; Wolt Drive in checkout; pickup-only | Fits V1 + familiar UX |
| 2 | Four methods: pharmacy pickup, local, ACS point (manual text), Cyprus door | Two methods; ACS later | Matches Cyprus pharmacy practice |
| 3 | Fees €0 / €3 / €4 / €6; free ≥ €40 on paid methods | Higher free threshold; defer amounts | Simple fixed options; peers ~€4 / ~€40 |
| 4 | UI as greater Nicosia; TK list TBD by client | Latsia-only; self-select zone | Flexible pre-launch |
| 5 | ACS = required free-text + link to ACS network | Notes-only; full address swap UI | Admin-readable without API |
| 6 | Static ETA + pharmacy hours in checkout | Schedule slots; no ETA copy | Wolt-like clarity without V1 blow-up |
| 7 | Local: before 13:00 working day → “today”; else next working day | Always next day; fake 30–90 min | Honest vs Wolt 30‑min |
| 8 | Admin “ready for pickup” + email when provider exists | Phone-only; full order tracker | Ops-friendly; aligns with P0 email |
| 9 | Approach: Medusa options + Kayia presentation config | Medusa-only hardcode; custom rate module | Reuse + ADR-0138 |

---

## Final design

### Architecture

**Medusa (authority)**

| Option | Fee | Notes |
| --- | --- | --- |
| Pharmacy pickup | €0 | Native **pickup** shipping option type |
| Local delivery | €3 → €0 if cart ≥ €40 | Service zone = greater Nicosia TK list (TBD) |
| ACS pickup point | €4 → €0 if cart ≥ €40 | Cyprus-wide zone; point stored in metadata |
| Cyprus door delivery | €6 → €0 if cart ≥ €40 | Cyprus-wide zone |

- Free threshold via Medusa **conditional flat prices** (price becomes 0), not a separate “free shipping” option.
- Manual fulfillment provider only (existing).

**Storefront (Kayia presentation config)**

- Maps option IDs → Greek labels, static ETA strings, cutoff logic (Asia/Nicosia, 13:00), pharmacy hours, ACS help link.
- When ACS selected: required `acs_pickup_point` field → cart/order **metadata**.
- Does not invent prices; displays Store API amounts (including 0 as «Δωρεάν»).

### Checkout flow

1. Contact (email, phone).  
2. Choose shipping method (labels + ETA; local copy depends on cutoff).  
3. Pickup → show pharmacy address (Δημήτρη Σταύρου 3ΑΒ, Λατσιά); no home address.  
4. Local / door → Cyprus address with postal code; reject local if TK outside zone (when list exists).  
5. ACS → required point text + link; persist `acs_pickup_point`.  
6. Stripe → `cart.complete` (unchanged money path).  
7. Confirmation repeats method, ETA, address or ACS point.

### Admin ops

- **Pickup:** prepare → mark **ready for pickup** → (email when available) → **Mark as picked up** when collected.  
- **Local / door / ACS:** fulfill → ship (optional manual tracking) → delivered; read ACS metadata for point-to-point handoff.  
- Wrong ACS point: resolve by phone; no automated re-route.

### Testing

- Price matrix €39 vs ≥€40; pickup always €0.  
- ACS empty field blocks pay.  
- Cutoff copy for local (two clock scenarios).  
- One manual/API happy path per method family (pickup ready; local fulfill; ACS metadata visible; door fulfill).  
- No ACS/Wolt API or live courier tests.

### Open before launch (client)

- Final greater-Nicosia postal-code list.  
- Confirm 13:00 cutoff and who runs local drops.  
- Canonical ACS points URL for the help link.  

---

## Implementation note

Do **not** implement until an explicit implementation plan is approved. Prefer a small ADR if this pattern is promoted from client config into starter defaults for other Cyprus SMBs.
