"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveClientNotes(
  clientId: string,
  workspaceId: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("client_notes").upsert(
    { client_id: clientId, workspace_id: workspaceId, content, updated_at: new Date().toISOString() },
    { onConflict: "client_id" },
  );

  if (error) return { error: "Could not save notes." };
  return {};
}
