"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inviteClientByEmail } from "@/lib/invite-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddClientState = { error: string } | { success: true } | null;

export async function addClient(
  _prevState: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!workspaceId) return { error: "Missing workspace." };
  if (!name) return { error: "Enter a client name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    workspace_id: workspaceId,
    name,
    email,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") return { error: "This client already exists in your workspace." };
    return { error: "Could not add client. Please try again." };
  }

  await inviteClientByEmail(email, workspaceId);

  revalidatePath("/dashboard");
  return { success: true };
}
