import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { canManageWorkspace } from "@/lib/can-manage-workspace";
import { getStripe } from "@/lib/stripe";

export async function POST() {
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
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — subscribe on the pricing page first." }, { status: 400 });
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
