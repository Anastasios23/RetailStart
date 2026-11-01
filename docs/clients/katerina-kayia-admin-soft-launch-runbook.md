# Kayia — Admin soft-launch runbook

**Audience:** Κατερίνα + 1–2 συνεργάτες (ίδιο Medusa Admin login)  
**Mode:** Soft launch — **no transactional email**. New orders are discovered only in Medusa Admin.  
**Related:** `docs/clients/katerina-kayia-soft-launch-hardening-design.md`, `docs/client-delivery-next-steps.md`

---

## Daily loop

1. Open Medusa Admin → **Orders**.
2. Sort/filter for new / unfulfilled orders (check at least every busy hour).
3. Open the order: note **shipping method name**, address, and metadata (`acs_pickup_point`, `kayia_shipping_method` if present).
4. Prepare products / reserve from shelf.
5. Complete the path for that method (below).
6. If the shopper calls about payment but no order exists → **Payment mismatch** section.

---

## By shipping method

### Παραλαβή από φαρμακείο (`pharmacy_pickup`)

1. Prepare the bag.
2. In Admin: mark fulfillment / **ready for pickup** (use whatever ready/picked-up controls your Medusa Admin build exposes; if only fulfill+ship exists, fulfill and note “ready” in order notes).
3. Call or SMS the customer (soft launch — no automated email).
4. When collected: mark as picked up / delivered equivalent so stock and order status stay clean.

### Τοπική παράδοση (Λευκωσία) (`local_delivery`)

1. Confirm address + TK. Zone list may still be open-ended — if outside greater Nicosia, call customer and switch plan (ACS / Cyprus door) offline; adjust notes.
2. Fulfill → arrange local drop (pharmacy courier / staff).
3. Mark shipped / delivered when done. Optional: paste a manual tracking note.

### Παραλαβή από σημείο ACS (`acs_point`)

1. Read **Σημείο ACS** from order metadata / notes (`acs_pickup_point`).
2. Hand parcel to ACS toward that point (manual process — no ACS API).
3. Fulfill → ship in Admin; add ACS receipt/tracking in notes if available.
4. Wrong point: resolve by phone; no automated re-route.

### Παράδοση σε διεύθυνση Κύπρου (`cyprus_door`)

1. Fulfill → give to courier for door delivery.
2. Ship / deliver in Admin; optional tracking in notes.

---

## Refund + restock

1. Prefer **Medusa Admin** refund UI for soft launch.
2. After refund, confirm inventory is restocked (receive return / restock steps in Admin if the order was fulfilled). A refund alone may leave stock reserved — always check the variant quantity on the product.
3. **Stance (P0 #2):** custom repo workflows under `apps/backend/src/workflows/{refunds,fulfillment,returns}/` are **not** the soft-launch operator path. Do not call them from scripts unless idempotency is wired. Admin-only.

---

## Payment mismatch (charged, no order)

**Stance (P0 #3):** Soft launch authority is **Stripe Dashboard + Medusa Admin**. In-memory recovery modules are not the ops tool.

1. Ask for approximate time, email, amount.
2. Stripe Dashboard → find PaymentIntent / charge.
3. If succeeded and no Medusa order: do **not** tell the customer to pay again. Either complete/reconcile via Admin tools if an incomplete cart exists, or refund in Stripe and invite a fresh checkout.
4. Record email + PI id in an internal note for the developer if stuck.

---

## Soft-launch checklist (first week)

- [ ] Admin login works for all staff sharing the account  
- [ ] One pickup test order end-to-end  
- [ ] One ACS order with visible pickup point  
- [ ] One local or door fulfill  
- [ ] One refund + confirm stock returned  
- [ ] Practice one “paid in Stripe, missing order” lookup  

## Public gate (later — not soft launch)

- Real transactional email (customer confirmation + admin new-order)  
- Verified Stripe → Medusa webhooks  
- Live-mode smoke purchase  
- Replace this “Admin-only discovery” section with email+Admin  
