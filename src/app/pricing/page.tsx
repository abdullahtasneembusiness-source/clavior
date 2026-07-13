import { createClient } from "@/lib/supabase/server";
import { getWorkspaceForUser } from "@/lib/get-workspace-for-user";
import { getWorkspaceSubscription, effectivePlan } from "@/lib/get-workspace-subscription";
import { PricingCards } from "@/components/pricing/pricing-cards";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan = null;
  if (user) {
    const workspace = await getWorkspaceForUser(supabase, user.id);
    if (workspace) {
      const subscription = await getWorkspaceSubscription(supabase, workspace.id);
      // Only treat them as "on" a plan for this page's purposes once a
      // subscription actually exists — effectivePlan()'s solo default is
      // for feature-gating elsewhere, not for labeling a button here.
      currentPlan = subscription ? effectivePlan(subscription) : null;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white" style={{ textWrap: "balance" as never }}>
          Simple pricing for growing founders
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start with a $1 trial. Cancel any time before it ends and you won&apos;t be charged.
        </p>
      </div>

      <PricingCards isLoggedIn={Boolean(user)} currentPlan={currentPlan} />
    </main>
  );
}
