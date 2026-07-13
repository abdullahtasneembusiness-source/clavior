import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe timestamps are Unix seconds; our columns are timestamptz.
function toIso(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

// current_period_end moved from the Subscription object itself onto its
// line items (to support multiple prices per subscription with different
// billing cycles) in this API version. Our checkout session always creates
// exactly one recurring item (the plan price — the $1 trial fee is a
// one-time item and never becomes a subscription item), so items.data[0]
// is always the one we want.
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  return subscription.items.data[0]?.current_period_end ?? null;
}

// invoice.subscription moved to invoice.parent.subscription_details.subscription
// in this API version (invoices can now originate from either a
// subscription or a quote, unified under `parent`).
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    // Log only the failure reason, never the raw body — it can contain
    // customer/payment metadata.
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      const plan = session.metadata?.plan;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (!workspaceId || !plan || !subscriptionId || !customerId) {
        console.error("checkout.session.completed missing required metadata", { workspaceId, plan });
        break;
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

      const { error } = await admin.from("subscriptions").upsert(
        {
          workspace_id: workspaceId,
          stripe_customer_id: customerId as string,
          stripe_subscription_id: subscription.id,
          plan,
          status: subscription.status,
          trial_ends_at: toIso(subscription.trial_end),
          current_period_end: toIso(getSubscriptionPeriodEnd(subscription)),
        },
        { onConflict: "workspace_id" },
      );
      if (error) console.error("Failed to upsert subscription after checkout:", error.message);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = subscription.metadata?.plan;

      const { error } = await admin
        .from("subscriptions")
        .update({
          status: subscription.status,
          ...(plan ? { plan } : {}),
          trial_ends_at: toIso(subscription.trial_end),
          current_period_end: toIso(getSubscriptionPeriodEnd(subscription)),
        })
        .eq("stripe_subscription_id", subscription.id);
      if (error) console.error("Failed to update subscription:", error.message);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Downgrade rather than delete the row: keeps stripe_customer_id
      // around so a resubscribe reuses the same Stripe customer, and
      // effectivePlan() already treats status='canceled' as Solo-tier
      // limits — no separate "locked" state needed.
      const { error } = await admin
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
      if (error) console.error("Failed to mark subscription canceled:", error.message);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const { error } = await admin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
        if (error) console.error("Failed to mark subscription past_due:", error.message);
      }

      // Not implemented: sending an actual warning email. Supabase doesn't
      // offer a general-purpose "send this custom email" API — only its own
      // auth emails (signup confirmation, invites, password reset). Sending
      // a real payment-failed notice needs a transactional email provider
      // (Resend, Postmark, etc.) wired in here with its own API key. Status
      // is still recorded above so the UI can surface a "payment failed"
      // state even without the email.
      console.log(`Payment failed for subscription ${subscriptionId ?? "unknown"} — no email sent (no provider configured).`);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
