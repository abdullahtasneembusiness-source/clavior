import "server-only";
import Stripe from "stripe";

// Lazily instantiated, not a module-level `new Stripe(...)` — Next.js
// evaluates route modules to collect page data at build time, which would
// otherwise construct this (and throw on a missing STRIPE_SECRET_KEY)
// before any request ever comes in, breaking the whole app's build rather
// than just failing the one route that needed the key.
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}
