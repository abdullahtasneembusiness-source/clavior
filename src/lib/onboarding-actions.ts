"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "my-workspace";
}

export type OnboardingState = { error: string } | null;

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();

  if (workspaceName.length < 1) return { error: "Enter a workspace name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expired. Please sign in again." };

  // 1. Create the workspace.
  const slug = slugify(workspaceName);
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name: workspaceName, slug })
    .select("id")
    .single();

  if (wsError) {
    if (wsError.code === "23505") return { error: "That workspace name is already taken. Try a variation." };
    return { error: "Could not create workspace. Please try again." };
  }

  // 2. Create the client record and send invite (if provided).
  if (clientName && clientEmail) {
    if (!EMAIL_RE.test(clientEmail)) return { error: "Enter a valid email for your client." };

    await supabase.from("clients").insert({
      workspace_id: workspace.id,
      name: clientName,
      email: clientEmail,
      status: "active",
    });

    // Send invitation email via Supabase's invite feature.
    // This creates an auth user and emails them a magic link.
    await supabase.auth.admin.inviteUserByEmail(clientEmail, {
      data: { invited_to_workspace: workspace.id, invited_as: "client" },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
    });
  }

  // 3. Mark onboarding complete in user metadata.
  await supabase.auth.updateUser({
    data: { onboarding_complete: true },
  });

  redirect("/dashboard");
}
