// A full-page navigation to a URL outside the Next.js router (Stripe
// Checkout, the Stripe Billing Portal) — router.push() can't do this since
// those are a different origin. Wrapped in a plain function rather than
// assigning window.location.href directly inside component/handler code,
// which the React Compiler ESLint rules flag as a possibly-unsafe mutation.
export function redirectTo(url: string): void {
  window.location.href = url;
}
