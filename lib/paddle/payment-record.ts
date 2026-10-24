import { sanitizeDiscountCode, type PriceVariant } from '@/lib/pricing'

/** The fields of a completed Paddle transaction we record on the project (funnel analysis). */
export interface TransactionLike {
  id: string
  currencyCode: string
  discountId: string | null
  customData: Record<string, unknown> | null
  details: { totals: { grandTotal: string } | null } | null
  items: { price: { id: string } | null }[]
}

export interface PaymentRecord {
  paddle_transaction_id: string
  amount_paid: number | null        // minor units (e.g. cents), from details.totals.grand_total
  currency: string                  // currency_code as Paddle sends it
  paid_price_variant: 'A' | 'B' | null
  discount_code: string | null
}

/**
 * Which Methea variant a transaction is for, from the SERVER-side price ids
 * (PADDLE_PRICE_ID_A/_B). The Paddle account is shared with other products
 * (o-nion, SOLA), so a transaction without one of these prices must never
 * unlock a project. Returns null for a foreign transaction.
 */
export function metheaVariantOf(tx: Pick<TransactionLike, 'items'>): PriceVariant | null {
  const a = process.env.PADDLE_PRICE_ID_A
  const b = process.env.PADDLE_PRICE_ID_B
  for (const item of tx.items) {
    const id = item.price?.id
    if (id && a && id === a) return 'A'
    if (id && b && id === b) return 'B'
  }
  return null
}

export function paymentRecordFromTransaction(tx: TransactionLike): PaymentRecord {
  const grandTotal = Number.parseInt(tx.details?.totals?.grandTotal ?? '', 10)
  // Paddle gives a discount_id, not the code; the code comes from our checkout
  // customData. Only recorded when Paddle actually applied a discount.
  const discountCode = tx.discountId
    ? sanitizeDiscountCode(tx.customData?.discount_code) ?? tx.discountId
    : null

  return {
    paddle_transaction_id: tx.id,
    amount_paid: Number.isFinite(grandTotal) ? grandTotal : null,
    currency: tx.currencyCode,
    // The variant actually charged, from the price on the transaction.
    paid_price_variant: metheaVariantOf(tx),
    discount_code: discountCode,
  }
}
