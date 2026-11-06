// The platform's cut of every purchase. A single hard-coded estimate until real
// payout configuration exists — change it here and nowhere else.
export const PLATFORM_FEE_RATE = 0.2;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats cents as USD, e.g. 123456 → "$1,234.56". Zero stays "$0.00". */
export function formatCents(cents: number) {
  return usd.format(cents / 100);
}

/** Estimated instructor earnings in cents. Rounds once, on the total. */
export function calculateEarnings(revenueCents: number) {
  return Math.round(revenueCents * (1 - PLATFORM_FEE_RATE));
}
