import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { canManageWorkspace } from "@/lib/can-manage-workspace";
import { getStripe } from "@/lib/stripe";
import { PLANS, TRIAL_DAYS, TRIAL_FEE_CENTS, isPlanId } from "@/lib/plans";

export async function POST(request: Request) {
  const { plan } = await request.json();
  if (!isPlanId(plan)) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const workspace = await getWorkspaceForUser(supabase, user.id);
  if (!workspace) return NextResponse.json({ error: "No workspace found." }, { status: 400 });

  const canManage = await canManageWorkspace(supabase, user.id, workspace.id, workspace.owner_id);
  if (!canManage) {
    return NextResponse.json({ error: "Only the workspace owner or an admin can manage billing." }, { status: 403 });
  }

  const admin = createAdminClient();
  const stripe = getStripe();
  const planConfig = PLANS[plan];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // Reuse an existing Stripe customer for this workspace if one already
  // exists (e.g. they're switching plans rather than subscribing fresh).
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  let customerId = existingSubscription?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { workspace_id: workspace.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: TRIAL_FEE_CENTS,
          product_data: { name: `Clovior ${planConfig.name} — ${TRIAL_DAYS}-day trial` },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          unit_amount: planConfig.priceCents,
          recurring: { interval: "month" },
          product_data: { name: `Clovior ${planConfig.name}` },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { workspace_id: workspace.id, plan },
    },
    metadata: { workspace_id: workspace.id, plan },
    success_url: `${siteUrl}/dashboard?success=true`,
    cancel_url: `${siteUrl}/pricing`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
