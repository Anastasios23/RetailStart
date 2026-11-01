"use client"

import { useActionState, useEffect, useState } from "react"
import type { FormEvent, FocusEvent, InvalidEvent, ReactNode } from "react"
import type { HttpTypes } from "@medusajs/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  selectShippingMethodAction,
  updateCheckoutContactAction,
} from "../actions/checkout-actions"
import {
  initialCheckoutActionState,
  type CheckoutActionState,
} from "../actions/checkout-action-state"
import type { CheckoutCountry } from "../../lib/medusa/checkout"
import {
  hasStoredCheckoutContact,
} from "../../lib/medusa/checkout-validation"
import type { CheckoutFieldName } from "../../lib/medusa/checkout-validation"
import {
  deriveCheckoutProgress,
  hasCurrentCheckoutTotals,
} from "../../lib/medusa/checkout-presentation"
import { CheckoutFinalizeOrder } from "./checkout-finalize-order"
import { StripePaymentForm } from "./stripe-payment-form"
import type {
  CheckoutPaymentIssue,
  CheckoutPaymentProjection,
} from "../../lib/medusa/checkout-payment"
import { canFinalizePaidPaymentSession } from "../../lib/medusa/checkout-payment"
import { formatMoney } from "../../lib/money"
import {
  formatKayiaShippingAmountLabel,
  getKayiaLocalZoneDisclaimer,
  getKayiaShippingAudience,
  getKayiaShippingEta,
  isKayiaAcsPoint,
  isKayiaLocalDelivery,
  isKayiaPickup,
  KAYIA_ACS_POINTS_URL,
  KAYIA_PHARMACY_ADDRESS,
  KAYIA_PHARMACY_HOURS,
  resolveKayiaShippingMethod,
} from "../../lib/presentation/kayia-shipping"

type CheckoutFormProps = {
  cart: HttpTypes.StoreCart
  countries: CheckoutCountry[]
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  shippingOptionsUnavailable: boolean
  payment: CheckoutPaymentProjection | null
  paymentUnavailable: boolean
  paymentIssue: CheckoutPaymentIssue | null
  publishableKey: string | null
}

type FieldElement = HTMLInputElement | HTMLSelectElement

const fieldClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

function getFieldError(state: CheckoutActionState, field: CheckoutFieldName): string | undefined {
  return state.fieldErrors?.[field]
}

function formatAmount(amount: unknown, currencyCode?: string | null): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null
  }

  return formatMoney(amount, currencyCode?.trim() || "eur", "el-CY")
}

function getShippingOptionAmount(
  option: HttpTypes.StoreCartShippingOptionWithServiceZone
): number | null {
  const calculatedAmount = option.calculated_price?.calculated_amount

  if (typeof calculatedAmount === "number" && Number.isFinite(calculatedAmount)) {
    return calculatedAmount
  }

  return typeof option.amount === "number" && Number.isFinite(option.amount)
    ? option.amount
    : null
}

function ActionMessage({ state }: { state: CheckoutActionState }) {
  if (state.status === "idle" || !state.message) {
    return null
  }

  return (
    <p
      className={cn(
        "text-sm",
        state.status === "error" ? "text-destructive" : "text-muted-foreground"
      )}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

function FieldShell({
  children,
  invalid,
}: {
  children: ReactNode
  invalid?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", invalid && "[&_input]:border-destructive [&_select]:border-destructive")}>
      {children}
    </div>
  )
}

function CheckoutSummary({ cart }: { cart: HttpTypes.StoreCart }) {
  const currencyCode = cart.currency_code
  const shippingMethod = cart.shipping_methods?.[0]
  const kayiaMethod =
    typeof cart.metadata?.kayia_shipping_method === "string"
      ? cart.metadata.kayia_shipping_method
      : null
  const acsPickupPoint =
    typeof cart.metadata?.acs_pickup_point === "string" ? cart.metadata.acs_pickup_point : null
  const shippingAmountLabel = formatKayiaShippingAmountLabel(
    typeof shippingMethod?.total === "number"
      ? shippingMethod.total
      : typeof shippingMethod?.amount === "number"
        ? shippingMethod.amount
        : null,
    formatAmount(shippingMethod?.total ?? shippingMethod?.amount, currencyCode)
  )
  const totals = [
    ["Προϊόντα", cart.item_subtotal],
    ["Αποστολή", cart.shipping_subtotal],
    ["ΦΠΑ", cart.tax_total],
    ["Υποσύνολο", cart.subtotal],
    ["Σύνολο", cart.total],
  ] as const

  return (
    <aside aria-labelledby="checkout-summary-title">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle id="checkout-summary-title">Σύνοψη παραγγελίας</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ul className="flex list-none flex-col gap-2 p-0">
            {(cart.items ?? []).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-muted-foreground">
                  {item.product_title || item.title} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  {formatAmount(item.total ?? item.item_total, currencyCode) ?? "—"}
                </span>
              </li>
            ))}
          </ul>

          {shippingMethod ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{shippingMethod.name}</span>
                <span className="font-medium">{shippingAmountLabel}</span>
              </div>
              {kayiaMethod === "acs_point" && acsPickupPoint ? (
                <p className="text-xs text-muted-foreground">Σημείο ACS: {acsPickupPoint}</p>
              ) : null}
              {kayiaMethod === "pharmacy_pickup" ? (
                <p className="text-xs text-muted-foreground">
                  {KAYIA_PHARMACY_ADDRESS.address_1}, {KAYIA_PHARMACY_ADDRESS.city}
                </p>
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-col gap-2">
            {totals.map(([label, amount]) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between gap-3",
                  label === "Σύνολο" && "text-base"
                )}
              >
                <span className={label === "Σύνολο" ? "font-semibold" : "text-muted-foreground"}>
                  {label}
                </span>
                <span className={label === "Σύνολο" ? "font-bold" : "font-medium"}>
                  {formatAmount(amount, currencyCode) ?? "—"}
                </span>
              </div>
            ))}
          </div>

          {!hasCurrentCheckoutTotals(cart) ? (
            <p className="text-sm text-destructive" role="alert">
              Τα σύνολα δεν είναι διαθέσιμα αυτή τη στιγμή από το σύστημα.
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/cart">Επιστροφή στο καλάθι</Link>
          </Button>
        </CardFooter>
      </Card>
    </aside>
  )
}

const PENDING_AUTH_POLL_MS = 4000
const PENDING_AUTH_POLL_MAX = 12

function PaymentStatusCard({ paymentIssue }: { paymentIssue: CheckoutPaymentIssue }) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [autoAttempts, setAutoAttempts] = useState(0)
  const shouldPoll = paymentIssue === "pending_authorization"

  useEffect(() => {
    if (!shouldPoll || autoAttempts >= PENDING_AUTH_POLL_MAX) {
      return
    }

    const timer = window.setTimeout(() => {
      setAutoAttempts((count) => count + 1)
      router.refresh()
    }, PENDING_AUTH_POLL_MS)

    return () => window.clearTimeout(timer)
  }, [autoAttempts, router, shouldPoll])

  const message =
    paymentIssue === "pending_authorization"
      ? "Η πληρωμή περιμένει έγκριση από την τράπεζα/Stripe. Μην ξαναβάλεις στοιχεία κάρτας — ελέγχουμε αυτόματα την κατάσταση."
      : paymentIssue === "error"
        ? "Η συνεδρία πληρωμής απέτυχε. Ανανέωσε το checkout πριν δοκιμάσεις ξανά."
        : "Χρειάζεται συγχρονισμός πληρωμής. Ανανέωσε το checkout πριν συνεχίσεις — μην ξαναχρεώσεις αν έχεις ήδη πληρώσει."

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Κατάσταση πληρωμής</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-destructive" role="alert">
          {message}
        </p>
        {shouldPoll && autoAttempts < PENDING_AUTH_POLL_MAX ? (
          <p className="text-xs text-muted-foreground">
            Αυτόματος έλεγχος {autoAttempts + 1}/{PENDING_AUTH_POLL_MAX}…
          </p>
        ) : null}
        {shouldPoll && autoAttempts >= PENDING_AUTH_POLL_MAX ? (
          <p className="text-xs text-muted-foreground">
            Η αυτόματη αναμονή τελείωσε. Πάτα «Έλεγχος κατάστασης» ή επικοινώνησε με το φαρμακείο αν η
            χρέωση ολοκληρώθηκε.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={checking}
          onClick={() => {
            setChecking(true)
            router.refresh()
            window.setTimeout(() => setChecking(false), 800)
          }}
        >
          {checking ? "Έλεγχος…" : "Έλεγχος κατάστασης"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/checkout">Ανανέωση σελίδας</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function ShippingOptions({
  cart,
  options,
  unavailable,
}: {
  cart: HttpTypes.StoreCart
  options: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  unavailable: boolean
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    selectShippingMethodAction,
    initialCheckoutActionState
  )
  const selectedOptionId = cart.shipping_methods?.[0]?.shipping_option_id
  const initialSelected =
    options.find((option) => option.id === selectedOptionId) ?? options[0] ?? null
  const [selectedId, setSelectedId] = useState(initialSelected?.id ?? "")
  const selectedOption = options.find((option) => option.id === selectedId) ?? initialSelected
  const selectedMethod = resolveKayiaShippingMethod(selectedOption)
  const storedAcsPoint =
    typeof cart.metadata?.acs_pickup_point === "string" ? cart.metadata.acs_pickup_point : ""

  useEffect(() => {
    if (selectedOptionId && selectedOptionId !== selectedId) {
      setSelectedId(selectedOptionId)
    }
  }, [selectedOptionId, selectedId])

  useEffect(() => {
    if (state.status === "success") {
      router.refresh()
    }
  }, [router, state.status])

  if (unavailable || options.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Τρόπος αποστολής</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {unavailable
            ? "Οι επιλογές αποστολής δεν είναι διαθέσιμες προσωρινά."
            : "Δεν υπάρχει διαθέσιμη επιλογή αποστολής για αυτή τη διεύθυνση."}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/checkout">Ανανέωση</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Τρόπος αποστολής / παραλαβή</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-muted-foreground">
          Επίλεξε μία μέθοδο. Χρόνοι = εκτιμήσεις ωραρίου (χωρίς live tracking). Δωρεάν αποστολή στις
          επί πληρωμή μεθόδους όταν το καλάθι είναι ≥ 40 €.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">{KAYIA_PHARMACY_HOURS}</p>
        <form action={formAction} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">Διαθέσιμες επιλογές αποστολής</legend>
            {options.map((option) => {
              const amount = getShippingOptionAmount(option)
              const amountLabel = formatKayiaShippingAmountLabel(
                amount,
                formatAmount(amount, cart.currency_code)
              )
              const method = resolveKayiaShippingMethod(option)
              const audience = getKayiaShippingAudience(method)
              const eta = getKayiaShippingEta(method)

              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border border-border px-4 py-3 text-sm",
                    "hover:border-primary/40 hover:bg-accent/40",
                    option.id === selectedId && "border-primary bg-accent"
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="shippingOptionId"
                        value={option.id}
                        checked={option.id === selectedId}
                        onChange={() => setSelectedId(option.id)}
                        disabled={amount === null}
                        required
                        className="mt-1 size-4 accent-[hsl(var(--primary))]"
                      />
                      <span className="flex flex-col gap-0.5">
                        <strong className="font-medium">{option.name}</strong>
                        <span className="text-xs text-muted-foreground">{audience}</span>
                        <span className="text-xs text-muted-foreground">{eta}</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">{amountLabel}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          {isKayiaPickup(selectedMethod) ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Παραλαβή από {KAYIA_PHARMACY_ADDRESS.address_1}, {KAYIA_PHARMACY_ADDRESS.city}{" "}
              {KAYIA_PHARMACY_ADDRESS.postal_code}. Θα ενημερωθείτε όταν είναι έτοιμη (τηλέφωνο /
              Admin — όχι email στο soft launch).
            </p>
          ) : null}

          {isKayiaLocalDelivery(selectedMethod) && getKayiaLocalZoneDisclaimer() ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              {getKayiaLocalZoneDisclaimer()}
            </p>
          ) : null}

          {isKayiaAcsPoint(selectedMethod) ? (
            <FieldShell>
              <label htmlFor="acs-pickup-point" className="text-sm font-medium">
                Σημείο ACS <span aria-hidden="true">*</span>
              </label>
              <Input
                id="acs-pickup-point"
                name="acs_pickup_point"
                type="text"
                required
                minLength={3}
                maxLength={200}
                defaultValue={storedAcsPoint}
                placeholder="π.χ. ACS Latsia, Αρχ. Μακαρίου 33"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Γράψε όνομα ή διεύθυνση σημείου. Βρες σημεία στο{" "}
                <a
                  href={KAYIA_ACS_POINTS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  δίκτυο ACS Cyprus
                </a>
                .
              </p>
            </FieldShell>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Αποθήκευση…" : "Αποθήκευση αποστολής"}
          </Button>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  )
}

export function CheckoutForm({
  cart,
  countries,
  shippingOptions,
  shippingOptionsUnavailable,
  payment,
  paymentUnavailable,
  paymentIssue,
  publishableKey,
}: CheckoutFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    updateCheckoutContactAction,
    initialCheckoutActionState
  )
  const [clientInvalidFields, setClientInvalidFields] = useState<Set<string>>(new Set())
  const address = cart.shipping_address
  const hasContactAddress = hasStoredCheckoutContact(cart.email, address)
  const hasShippingMethod = Boolean(
    !shippingOptionsUnavailable &&
      cart.shipping_methods?.some((method) =>
        shippingOptions.some((option) => option.id === method.shipping_option_id)
      )
  )
  const progress = deriveCheckoutProgress({
    hasContactAddress,
    hasShippingMethod,
    hasCurrentTotals: hasCurrentCheckoutTotals(cart),
  })

  useEffect(() => {
    if (state.status === "success") {
      router.refresh()
    }
  }, [router, state.status])

  function syncNativeValidity(field: FieldElement) {
    setClientInvalidFields((previous) => {
      const next = new Set(previous)
      if (field.validity.valid) next.delete(field.name)
      else next.add(field.name)
      return next
    })
  }

  function getFieldFromEvent(event: { target: EventTarget | null }): FieldElement | null {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target
      : null
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)
    if (field) syncNativeValidity(field)
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)
    if (field) syncNativeValidity(field)
  }

  function handleInvalid(event: InvalidEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)
    if (field) syncNativeValidity(field)
  }

  function fieldProps(name: CheckoutFieldName, errorId: string) {
    const error = getFieldError(state, name)
    return {
      "aria-invalid": error || clientInvalidFields.has(name) ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
    }
  }

  const progressCopy =
    progress === "contact_address_incomplete"
      ? "Συμπλήρωσε στοιχεία επικοινωνίας και διεύθυνση."
      : progress === "shipping_required"
        ? "Επίλεξε τρόπο αποστολής για να συνεχίσεις."
        : progress === "totals_unavailable"
          ? "Τα σύνολα checkout δεν είναι διαθέσιμα αυτή τη στιγμή."
          : "Έτοιμο για ασφαλή πληρωμή."

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground" aria-live="polite">
          {progressCopy}
        </p>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Επικοινωνία και διεύθυνση</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Η χρέωση χρησιμοποιεί την ίδια διεύθυνση για παραγγελία ως επισκέπτης.
            </p>
            <form
              action={formAction}
              className="flex flex-col gap-4"
              onBlur={handleBlur}
              onInput={handleInput}
              onInvalid={handleInvalid}
            >
              <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-2">
                <legend className="sr-only">Στοιχεία επικοινωνίας και παράδοσης</legend>

                <FieldShell invalid={Boolean(getFieldError(state, "email") || clientInvalidFields.has("email"))}>
                  <label htmlFor="checkout-email" className="text-sm font-medium">
                    Email <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="checkout-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    defaultValue={cart.email ?? ""}
                    required
                    className="rounded-xl"
                    {...fieldProps("email", "checkout-email-error")}
                  />
                  <FieldError id="checkout-email-error" message={getFieldError(state, "email")} />
                </FieldShell>

                <FieldShell invalid={Boolean(getFieldError(state, "first_name") || clientInvalidFields.has("first_name"))}>
                  <label htmlFor="checkout-first-name" className="text-sm font-medium">
                    Όνομα <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="checkout-first-name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    maxLength={100}
                    defaultValue={address?.first_name ?? ""}
                    required
                    className="rounded-xl"
                    {...fieldProps("first_name", "checkout-first-name-error")}
                  />
                  <FieldError id="checkout-first-name-error" message={getFieldError(state, "first_name")} />
                </FieldShell>

                <FieldShell invalid={Boolean(getFieldError(state, "last_name") || clientInvalidFields.has("last_name"))}>
                  <label htmlFor="checkout-last-name" className="text-sm font-medium">
                    Επώνυμο <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="checkout-last-name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    maxLength={100}
                    defaultValue={address?.last_name ?? ""}
                    required
                    className="rounded-xl"
                    {...fieldProps("last_name", "checkout-last-name-error")}
                  />
                  <FieldError id="checkout-last-name-error" message={getFieldError(state, "last_name")} />
                </FieldShell>

                <div className="sm:col-span-2">
                  <FieldShell
                    invalid={Boolean(getFieldError(state, "address_1") || clientInvalidFields.has("address_1"))}
                  >
                    <label htmlFor="checkout-address-1" className="text-sm font-medium">
                      Διεύθυνση <span aria-hidden="true">*</span>
                    </label>
                    <Input
                      id="checkout-address-1"
                      name="address_1"
                      type="text"
                      autoComplete="address-line1"
                      maxLength={200}
                      defaultValue={address?.address_1 ?? ""}
                      required
                      className="rounded-xl"
                      {...fieldProps("address_1", "checkout-address-1-error")}
                    />
                    <FieldError id="checkout-address-1-error" message={getFieldError(state, "address_1")} />
                  </FieldShell>
                </div>

                <FieldShell invalid={Boolean(getFieldError(state, "city") || clientInvalidFields.has("city"))}>
                  <label htmlFor="checkout-city" className="text-sm font-medium">
                    Πόλη <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="checkout-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    maxLength={100}
                    defaultValue={address?.city ?? ""}
                    required
                    className="rounded-xl"
                    {...fieldProps("city", "checkout-city-error")}
                  />
                  <FieldError id="checkout-city-error" message={getFieldError(state, "city")} />
                </FieldShell>

                <FieldShell
                  invalid={Boolean(getFieldError(state, "postal_code") || clientInvalidFields.has("postal_code"))}
                >
                  <label htmlFor="checkout-postal-code" className="text-sm font-medium">
                    Τ.Κ. <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="checkout-postal-code"
                    name="postal_code"
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={40}
                    defaultValue={address?.postal_code ?? ""}
                    required
                    className="rounded-xl"
                    {...fieldProps("postal_code", "checkout-postal-code-error")}
                  />
                  <FieldError id="checkout-postal-code-error" message={getFieldError(state, "postal_code")} />
                </FieldShell>

                <FieldShell
                  invalid={Boolean(getFieldError(state, "country_code") || clientInvalidFields.has("country_code"))}
                >
                  <label htmlFor="checkout-country" className="text-sm font-medium">
                    Χώρα <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="checkout-country"
                    name="country_code"
                    autoComplete="country"
                    defaultValue={address?.country_code?.toUpperCase() ?? ""}
                    required
                    className={fieldClassName}
                    {...fieldProps("country_code", "checkout-country-error")}
                  >
                    <option value="">Επίλεξε χώρα</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="checkout-country-error" message={getFieldError(state, "country_code")} />
                </FieldShell>
              </fieldset>

              <Button type="submit" disabled={pending}>
                {pending ? "Αποθήκευση…" : "Αποθήκευση στοιχείων"}
              </Button>
              <ActionMessage state={state} />
            </form>
          </CardContent>
        </Card>

        {hasContactAddress ? (
          <ShippingOptions
            cart={cart}
            options={shippingOptions}
            unavailable={shippingOptionsUnavailable}
          />
        ) : null}

        {progress === "ready_for_payment" && payment ? (
          <StripePaymentForm payment={payment} publishableKey={publishableKey} />
        ) : null}

        {progress === "ready_for_payment" &&
        paymentIssue &&
        canFinalizePaidPaymentSession(cart) ? (
          <CheckoutFinalizeOrder
            title="Ολοκλήρωση παραγγελίας"
            intro={`Η πληρωμή εμφανίζεται ως «${paymentIssue}». Ολοκλήρωσε την παραγγελία χωρίς να ξαναβάλεις στοιχεία κάρτας.`}
            submitLabel="Ολοκλήρωση παραγγελίας"
            pendingLabel="Ολοκλήρωση…"
          />
        ) : null}

        {progress === "ready_for_payment" &&
        paymentIssue &&
        !canFinalizePaidPaymentSession(cart) ? (
          <PaymentStatusCard paymentIssue={paymentIssue} />
        ) : null}

        {progress === "ready_for_payment" && !payment && !paymentIssue && paymentUnavailable ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Πληρωμή προσωρινά μη διαθέσιμη</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Δεν μπορέσαμε να προετοιμάσουμε την πληρωμή Stripe. Το καλάθι παραμένει διαθέσιμο.
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/checkout">Ανανέωση</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>

      <CheckoutSummary cart={cart} />
    </div>
  )
}
